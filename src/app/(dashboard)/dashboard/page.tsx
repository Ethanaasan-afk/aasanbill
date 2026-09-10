"use client";

import { LiveRatesTicker } from "@/components/metal-rates/live-rates-ticker";
import { MonoVizGrid } from "@/components/dashboard/mono-viz";
import { LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { useBusinessType } from "@/hooks/use-business-type";
import { useCustomers } from "@/hooks/use-customers";
import { useInvoices } from "@/hooks/use-invoices";
import { usePayments } from "@/hooks/use-payments";
import { useProducts } from "@/hooks/use-products";
import { buildOutstandingRows } from "@/lib/customer-ledger";
import { formatDate, formatINR } from "@/lib/utils";
import { AlertTriangle, IndianRupee, Package, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export default function DashboardPage() {
  const { isHotel, labels } = useBusinessType();
  const { data: invoices, isLoading: loadingInv } = useInvoices();
  const { data: products, isLoading: loadingProd } = useProducts();
  const { data: customers, isLoading: loadingCust } = useCustomers();
  const { data: payments, isLoading: loadingPay } = usePayments();

  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const month = today.getMonth();
    const year = today.getFullYear();
    const allInvoices = invoices ?? [];
    const active = allInvoices.filter((i) => i.status !== "cancelled");
    const monthInvoices = active.filter((i) => {
      const d = new Date(i.invoice_date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const todayInvoices = active.filter((i) => i.invoice_date === todayStr);
    const monthRevenue = monthInvoices.reduce((s, i) => s + i.grand_total, 0);
    const todayRevenue = todayInvoices.reduce((s, i) => s + i.grand_total, 0);

    const outstandingRows = buildOutstandingRows(
      customers ?? [],
      allInvoices,
      payments ?? []
    );
    const totalOutstanding = outstandingRows.reduce((s, r) => s + r.outstanding, 0);
    const monthCollected = (payments ?? [])
      .filter((p) => {
        const d = new Date(p.payment_date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((s, p) => s + Number(p.amount), 0);

    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const salesByDay = (key: string) =>
      active.filter((inv) => inv.invoice_date === key).reduce((s, inv) => s + inv.grand_total, 0);
    const collectedByDay = (key: string) =>
      (payments ?? [])
        .filter((p) => p.payment_date === key)
        .reduce((s, p) => s + Number(p.amount), 0);

    const wave: { label: string; sales: number; collected: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      wave.push({
        label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        sales: salesByDay(key),
        collected: collectedByDay(key),
      });
    }

    const pl = wave.map((w) => ({ label: w.label, v: w.collected - w.sales }));

    const billedCustomers = new Set(
      monthInvoices.map((i) => i.customer_id).filter(Boolean)
    ).size;
    const paidCount = monthInvoices.filter((i) => i.status === "paid").length;
    const custN = (customers ?? []).length || 1;
    const funnel = [
      { label: "Customers", value: String((customers ?? []).length), pct: 1 },
      {
        label: "Bought",
        value: String(billedCustomers),
        pct: billedCustomers / custN,
      },
      {
        label: "Bills",
        value: String(monthInvoices.length),
        pct: monthInvoices.length / Math.max(1, billedCustomers || monthInvoices.length),
      },
      {
        label: "Paid",
        value: String(paidCount),
        pct: monthInvoices.length ? paidCount / monthInvoices.length : 0,
      },
    ];

    const bars: { label: string; billed: number; collected: number; unpaid: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      const billed = salesByDay(key);
      const collected = collectedByDay(key);
      bars.push({
        label: d.toLocaleDateString("en-GB", { weekday: "short" }),
        billed,
        collected,
        unpaid: Math.max(0, billed - collected),
      });
    }

    const heat: { date: string; count: number }[] = [];
    for (let i = 12 * 7 - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      heat.push({
        date: key,
        count: active.filter((inv) => inv.invoice_date === key).length,
      });
    }

    const activeProducts = (products ?? []).filter((p) => p.is_active);
    const skusInStock = activeProducts.filter((p) => (p.current_stock ?? 0) > p.reorder_threshold).length;
    const skusLow = activeProducts.filter(
      (p) => (p.current_stock ?? 0) > 0 && (p.current_stock ?? 0) <= p.reorder_threshold
    ).length;
    const skusOut = activeProducts.filter((p) => (p.current_stock ?? 0) <= 0).length;
    const monthPaidCount = monthInvoices.filter((i) => i.status === "paid").length;
    const paidShare = monthInvoices.length ? monthPaidCount / monthInvoices.length : 0;
    const collectedShare =
      monthRevenue > 0 ? Math.min(1, monthCollected / monthRevenue) : 0;
    const stockOkShare = activeProducts.length ? skusInStock / activeProducts.length : 1;

    const ringLegend = [
      { label: "Bills this month", value: String(monthInvoices.length), pct: 1, color: "var(--primary-soft)" },
      { label: "Paid bills", value: String(monthPaidCount), pct: paidShare, color: "var(--primary)" },
      {
        label: "Money in",
        value: formatINR(monthCollected),
        pct: collectedShare,
        color: "var(--aqua)",
      },
      {
        label: "Stock OK",
        value: `${Math.round(stockOkShare * 100)}%`,
        pct: stockOkShare,
        color: "var(--emerald)",
      },
    ];

    const lowStock = activeProducts
      .filter((p) => (p.current_stock ?? 0) <= p.reorder_threshold)
      .sort((a, b) => (a.current_stock ?? 0) - (b.current_stock ?? 0))
      .slice(0, 6);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const expiringSoon = activeProducts
      .filter((p) => !!p.exp_date)
      .map((p) => {
        const exp = new Date(p.exp_date + "T00:00:00");
        const daysLeft = Math.round(
          (exp.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { product: p, daysLeft };
      })
      .filter((x) => x.daysLeft <= 14)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);

    return {
      monthRevenue,
      todayRevenue,
      monthSalesCount: monthInvoices.length,
      monthCollected,
      totalOutstanding,
      outstandingCount: outstandingRows.length,
      customerCount: (customers ?? []).length,
      wave,
      bars,
      heat,
      pl,
      funnel,
      ringLegend,
      paidShare,
      collectedShare,
      stockOkShare,
      donut: [
        { name: "In stock", value: skusInStock, fill: "var(--primary)" },
        { name: "Low", value: skusLow, fill: "var(--amber)" },
        { name: "Out", value: skusOut, fill: "var(--rose)" },
      ],
      recentInvoices: [...allInvoices].slice(0, 8),
      lowStock,
      expiringSoon,
    };
  }, [invoices, products, customers, payments]);

  if (loadingInv || loadingProd || loadingCust || loadingPay) return <LoadingBlock />;

  return (
    <div>
      <PageHeader
        title="Home"
        description="A quick look at sales, money owed, and stock."
        actions={
          <Link
            href="/invoices/new"
            className="btn-gradient inline-flex min-h-[44px] items-center gap-2 rounded-button px-4 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New invoice
          </Link>
        }
      />

      <LiveRatesTicker />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/invoices"
          className="rounded-[12px] border border-border bg-surface p-4 transition-colors hover:border-primary/40"
        >
          <p className="text-sm text-slate">Sales this month</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">
            {formatINR(stats.monthRevenue)}
          </p>
          <p className="mt-1 text-xs text-slate">
            {stats.monthSalesCount} bill{stats.monthSalesCount === 1 ? "" : "s"} · today{" "}
            {formatINR(stats.todayRevenue)}
          </p>
        </Link>

        <Link
          href="/outstanding"
          className="rounded-[12px] border border-border bg-surface p-4 transition-colors hover:border-primary/40"
        >
          <p className="flex items-center gap-1.5 text-sm text-slate">
            <IndianRupee className="h-3.5 w-3.5" aria-hidden />
            Still to collect
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">
            {formatINR(stats.totalOutstanding)}
          </p>
          <p className="mt-1 text-xs text-slate">
            {stats.outstandingCount === 0
              ? "No pending udhaar"
              : `${stats.outstandingCount} customer${stats.outstandingCount === 1 ? "" : "s"} owe you`}
          </p>
        </Link>

        <Link
          href="/customers"
          className="rounded-[12px] border border-border bg-surface p-4 transition-colors hover:border-primary/40"
        >
          <p className="flex items-center gap-1.5 text-sm text-slate">
            <Users className="h-3.5 w-3.5" aria-hidden />
            Customers
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{stats.customerCount}</p>
          <p className="mt-1 text-xs text-slate">Saved in your book</p>
        </Link>

        {!isHotel && (
          <Link
            href="/inventory"
            className="rounded-[12px] border border-border bg-surface p-4 transition-colors hover:border-primary/40"
          >
            <p className="flex items-center gap-1.5 text-sm text-slate">
              <Package className="h-3.5 w-3.5" aria-hidden />
              {labels.productPlural} to restock
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">
              {stats.lowStock.length}
            </p>
            <p className="mt-1 text-xs text-slate">
              {stats.lowStock.length === 0 ? "Stock looks fine" : "Low or finished"}
            </p>
          </Link>
        )}
      </div>

      <MonoVizGrid
        wave={stats.wave}
        billed={stats.monthRevenue}
        collected={stats.monthCollected}
        unpaid={stats.totalOutstanding}
        monthBills={stats.monthSalesCount}
        paidShare={stats.paidShare}
        collectedShare={stats.collectedShare}
        stockOkShare={isHotel ? 1 : stats.stockOkShare}
        donut={stats.donut}
        bars={stats.bars}
        heat={stats.heat}
        pl={stats.pl}
        funnel={stats.funnel}
        ringLegend={stats.ringLegend}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[12px] border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-display text-base font-semibold text-ink">Recent bills</h2>
            <Link href="/invoices" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {!stats.recentInvoices.length ? (
            <p className="px-4 py-8 text-sm text-slate">No bills yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.recentInvoices.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-3 hover:bg-surface-hover"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {inv.customer?.name ?? "Customer"}
                      </p>
                      <p className="text-xs text-slate">
                        {inv.invoice_number} · {formatDate(inv.invoice_date)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-ink">
                      {formatINR(inv.grand_total)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[12px] border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-tangerine-deep" aria-hidden />
            <h2 className="font-display text-base font-semibold text-ink">Needs a look</h2>
          </div>
          {isHotel && stats.outstandingCount === 0 && stats.expiringSoon.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate">Nothing urgent right now.</p>
          ) : !isHotel &&
            stats.lowStock.length === 0 &&
            stats.expiringSoon.length === 0 &&
            stats.outstandingCount === 0 ? (
            <p className="px-4 py-8 text-sm text-slate">Nothing urgent right now.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.outstandingCount > 0 && (
                <li>
                  <Link
                    href="/outstanding"
                    className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-surface-hover"
                  >
                    <span>Collect pending money</span>
                    <span className="font-semibold">{formatINR(stats.totalOutstanding)}</span>
                  </Link>
                </li>
              )}
              {!isHotel &&
                stats.lowStock.map((p) => {
                  const qty = p.current_stock ?? 0;
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/products/${p.id}`}
                        className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-surface-hover"
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="shrink-0 text-slate">
                          {qty <= 0 ? "Out of stock" : `${qty} left`}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              {stats.expiringSoon.map(({ product: p, daysLeft }) => (
                <li key={`exp-${p.id}`}>
                  <Link
                    href={`/products/${p.id}`}
                    className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-surface-hover"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 text-slate">
                      {daysLeft < 0
                        ? "Expired"
                        : daysLeft === 0
                          ? "Expires today"
                          : `Expires in ${daysLeft} days`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
