/**
 * Billing repository — every Mongoose query for subscriptions lives here.
 */
import { Subscription, ISubscription } from "../../models/Subscription";

export const findSubscriptionByUserId = async (
  userId: string
): Promise<ISubscription | null> => {
  return Subscription.findOne({ userId });
};

export const findSubscriptionByLsId = async (
  lsSubscriptionId: string
): Promise<ISubscription | null> => {
  return Subscription.findOne({ lsSubscriptionId });
};

export const createSubscription = async (
  data: Record<string, any>
): Promise<ISubscription> => {
  return Subscription.create(data);
};

export const updateSubscriptionById = async (
  id: string,
  data: Record<string, any>
): Promise<ISubscription | null> => {
  return Subscription.findByIdAndUpdate(id, { $set: data }, { new: true });
};

/**
 * Creates the implicit free-plan row for an account on first read.
 * `$setOnInsert` means the write is a no-op when the row already exists.
 */
export const upsertFreeSubscription = async (
  userId: string
): Promise<ISubscription> => {
  return Subscription.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        plan: "free",
        interval: "monthly",
        status: "free",
      },
    },
    { new: true, upsert: true }
  );
};

export const deleteSubscriptionByUserId = async (
  userId: string
): Promise<ISubscription | null> => {
  return Subscription.findOneAndDelete({ userId });
};
