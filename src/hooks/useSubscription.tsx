import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: unknown;
  scan_limit: number;
}

interface UserSubscription {
  id: string;
  plan_id: string;
  status: string;
  scans_used: number;
  plan: SubscriptionPlan;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .order('price_monthly');

        if (error) throw error;
        setPlans(data || []);
      } catch (error) {
        console.error('Error fetching plans:', error);
      }
    };

    fetchPlans();
  }, []);

  useEffect(() => {
    const fetchUserSubscription = async () => {
      if (!user) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            plan:subscription_plans(*)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        setSubscription(data as UserSubscription);
      } catch (error) {
        console.error('Error fetching user subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserSubscription();
  }, [user]);

  const canPerformScan = (scanType: 'basic' | 'advanced' | 'deep') => {
    if (!subscription) return false;
    
    const { plan, scans_used } = subscription;
    
    // Check scan limit
    if (plan.scan_limit && scans_used >= plan.scan_limit) return false;
    
    // Check plan restrictions
    if (plan.name === 'Free' && scanType !== 'basic') return false;
    
    return true;
  };

  const getRemainingScans = () => {
    if (!subscription) return 0;
    const { plan, scans_used } = subscription;
    if (!plan.scan_limit) return Infinity;
    return Math.max(0, plan.scan_limit - scans_used);
  };

  return {
    subscription,
    plans,
    loading,
    canPerformScan,
    getRemainingScans,
  };
};