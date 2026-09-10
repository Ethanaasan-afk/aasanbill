declare module "razorpay" {
  interface RazorpayOptions {
    key_id: string;
    key_secret: string;
  }

  interface RazorpayCustomer {
    id: string;
    email?: string;
    name?: string;
  }

  interface RazorpaySubscription {
    id: string;
    status: string;
    plan_id: string;
    current_start?: number;
    current_end?: number;
    charge_at?: number;
    customer_id?: string;
  }

  export default class Razorpay {
    constructor(options: RazorpayOptions);
    customers: {
      create(data: Record<string, unknown>): Promise<RazorpayCustomer>;
    };
    subscriptions: {
      create(data: Record<string, unknown>): Promise<RazorpaySubscription>;
      cancel(subscriptionId: string, cancelAtCycleEnd?: boolean): Promise<RazorpaySubscription>;
      fetch(subscriptionId: string): Promise<RazorpaySubscription>;
    };
  }
}
