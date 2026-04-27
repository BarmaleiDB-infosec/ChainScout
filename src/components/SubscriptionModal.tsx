import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Shield } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useSubscription } from '@/hooks/useSubscription';

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SubscriptionModal = ({ open, onOpenChange }: SubscriptionModalProps) => {
  const { t } = useTranslation();
  const { plans, subscription } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = (planId: string) => {
    // For now, just close the modal
    // In a real implementation, this would handle payment processing
    setSelectedPlan(planId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">{t('subscriptionPlans')}</DialogTitle>
          <DialogDescription className="text-center">
            {t('choosePlan')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {plans.map((plan) => {
            const isCurrentPlan = subscription?.plan_id === plan.id;
            const isFree = plan.name === 'Free';
            
            return (
              <Card 
                key={plan.id} 
                className={`relative transition-all duration-300 hover:shadow-lg ${
                  !isFree ? 'border-primary shadow-md' : 'border-border'
                } ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
              >
                {!isFree && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1">
                      <Crown className="w-3 h-3 mr-1" />
                      {t('popular')}
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    {isFree ? (
                      <Shield className="w-12 h-12 text-muted-foreground" />
                    ) : (
                      <Crown className="w-12 h-12 text-primary" />
                    )}
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <div className="text-3xl font-bold text-foreground">
                      ${plan.price_monthly}
                      <span className="text-base font-normal text-muted-foreground">/month</span>
                    </div>
                    {plan.price_yearly > 0 && (
                      <div className="text-sm text-muted-foreground mt-1">
                        ${plan.price_yearly}/year (save 2 months)
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-sm">
                        {plan.scan_limit ? `${plan.scan_limit} scans per month` : 'Unlimited scans'}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    className="w-full"
                    variant={isFree ? "outline" : "default"}
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan ? t('currentPlan') : t('selectPlan')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionModal;