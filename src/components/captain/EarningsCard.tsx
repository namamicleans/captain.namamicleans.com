"use client";

import { TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function EarningsCard() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Earnings</h3>
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground text-center">
            Coming Soon
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* 
 * TODO: Earnings Integration - Coming Soon
 * Will be integrated later with full earnings tracking functionality
 */

// import { IndianRupee, Wallet } from 'lucide-react';
// import { useCaptain } from '@/context/CaptainContext';

// export function EarningsCard() {
//   const { earnings } = useCaptain();

//   return (
//     <Card>
//       <CardContent className="p-4">
//         <div className="flex items-center justify-between mb-4">
//           <h3 className="font-semibold text-foreground">Today&apos;s Earnings</h3>
//           <TrendingUp className="h-5 w-5 text-primary" />
//         </div>
//         
//         <div className="flex items-baseline gap-1 mb-4">
//           <IndianRupee className="h-6 w-6 text-foreground" />
//           <span className="text-3xl font-bold text-foreground">
//             {earnings.today.toLocaleString()}
//           </span>
//         </div>

//         <div className="grid grid-cols-2 gap-3">
//           <div className="bg-accent/50 rounded-lg p-3">
//             <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
//               <Wallet className="h-4 w-4" />
//               <span>This Week</span>
//             </div>
//             <span className="font-semibold text-foreground">
//               ₹{earnings.thisWeek.toLocaleString()}
//             </span>
//           </div>
//           <div className="bg-accent/50 rounded-lg p-3">
//             <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
//               <Wallet className="h-4 w-4" />
//               <span>This Month</span>
//             </div>
//             <span className="font-semibold text-foreground">
//               ₹{earnings.thisMonth.toLocaleString()}
//             </span>
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }
