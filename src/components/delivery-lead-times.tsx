import { brand } from "@/lib/brand";

export function DeliveryLeadTimes({ className }: { className?: string }) {
  return (
    <div className={className} data-delivery-lead-times>
      <p>{brand.pickupLeadTime}</p>
      <p>{brand.shippingLeadTime}</p>
    </div>
  );
}
