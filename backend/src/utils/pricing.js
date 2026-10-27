// A member's plan keeps the price they signed up at, coupon included: registering with
// a 12.5% coupon creates "Dynamic: Gym (35,000 RWF) - Coupon X" with monthly_fee 35,000.
// A renewal is a new purchase, so it is charged the current service prices; a discount
// only applies again if the coupon is entered on the renewal itself.
// Plans that are not service-based (fixed packages) keep charging their own fee.
export async function renewalMonthlyFee(db, gymId, plan) {
  const planFee = Number(plan.monthly_fee) || 0;
  if (!plan.name?.startsWith('Dynamic:') || !plan.included_services) return planFee;

  let total = 0;
  for (const serviceName of plan.included_services.split(',')) {
    const service = await db.get(
      `SELECT price_monthly FROM services WHERE gym_id = ? AND LOWER(name) = ?`,
      [gymId, serviceName.trim().toLowerCase()]
    );
    // A service that no longer exists cannot be priced, so keep the plan's own fee.
    if (!service) return planFee;
    total += Number(service.price_monthly) || 0;
  }
  return total > 0 ? total : planFee;
}
