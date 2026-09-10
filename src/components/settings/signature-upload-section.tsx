"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useUpdateCompanySettings } from "@/hooks/use-company";
import { isDemoMode } from "@/lib/demo/mode";
import {
  isAllowedSignatureFile,
  SIGNATURE_ACCEPT,
  SIGNATURE_BUCKET,
  signatureObjectPath,
} from "@/lib/signature-storage";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SignatureUploadSection({
  organizationId,
  signatureUrl,
}: {
  organizationId: string;
  signatureUrl?: string | null;
}) {
  const update = useUpdateCompanySettings();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(signatureUrl ?? null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPreview(signatureUrl ?? null);
  }, [signatureUrl]);

  const persistUrl = async (url: string | null) => {
    await update.mutateAsync({ id: organizationId, signature_url: url });
    setPreview(url);
  };

  const uploadFile = async (file: File) => {
    const validation = isAllowedSignatureFile(file);
    if (validation) {
      toast(validation, "error");
      return;
    }

    setBusy(true);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    try {
      if (isDemoMode()) {
        await persistUrl(localPreview);
        toast("Signature saved (demo)");
        return;
      }

      const supabase = createClient();
      const path = signatureObjectPath(organizationId, file.type || file.name);

      await supabase.storage
        .from(SIGNATURE_BUCKET)
        .remove([
          `${organizationId}/signature.png`,
          `${organizationId}/signature.jpg`,
          `${organizationId}/signature.jpeg`,
        ]);

      const { error: upErr } = await supabase.storage
        .from(SIGNATURE_BUCKET)
        .upload(path, file, {
          upsert: true,
          contentType: file.type || "image/png",
          cacheControl: "3600",
        });

      if (upErr) throw new Error(upErr.message);

      const { data: pub } = supabase.storage.from(SIGNATURE_BUCKET).getPublicUrl(path);
      const publicUrl = `${pub.publicUrl}?v=${Date.now()}`;
      await persistUrl(publicUrl);
      URL.revokeObjectURL(localPreview);
      toast("Signature uploaded");
    } catch (e) {
      URL.revokeObjectURL(localPreview);
      setPreview(signatureUrl ?? null);
      const msg = (e as Error).message || "Upload failed";
      toast(
        /bucket|policy|row-level|not found|signature_url/i.test(msg)
          ? `${msg} - run PASTE_028_org_signature.sql in Supabase if you haven’t.`
          : msg,
        "error"
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onRemove = async () => {
    setBusy(true);
    try {
      if (!isDemoMode()) {
        const supabase = createClient();
        await supabase.storage
          .from(SIGNATURE_BUCKET)
          .remove([
            `${organizationId}/signature.png`,
            `${organizationId}/signature.jpg`,
            `${organizationId}/signature.jpeg`,
          ]);
      }
      await persistUrl(null);
      toast("Signature removed");
    } catch (e) {
      toast((e as Error).message || "Could not remove signature", "error");
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  return (
    <div>
      <h2 className="mb-1 text-sm font-semibold text-ink">Signature</h2>
      <p className="mb-3 text-xs text-slate">
        Used as the authorized signatory image on invoices. A transparent PNG
        works best (max 2MB).
      </p>

      {preview ? (
        <div className="flex flex-wrap items-end gap-4 rounded-[10px] border border-border bg-surface-hover/40 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Authorized signature preview"
            className="h-16 w-auto max-w-[220px] object-contain"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy || update.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" /> Replace
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || update.isPending}
              onClick={() => void onRemove()}
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed px-4 py-8 text-center transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border bg-surface-hover/30 hover:border-primary/50"
          )}
        >
          <ImagePlus className="h-6 w-6 text-slate" />
          <p className="text-sm font-medium text-ink">Upload your signature</p>
          <p className="text-xs text-slate">
            Click to browse or drag and drop · PNG or JPEG · max 2MB
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            className="mt-1 pointer-events-none"
          >
            <Upload className="h-3.5 w-3.5" /> Choose file
          </Button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={SIGNATURE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadFile(file);
        }}
      />
    </div>
  );
}
