import fs from 'fs';

let c = fs.readFileSync('app/(dashboard)/admin/page.tsx', 'utf8');
if (!c.includes('Target } from "lucide-react"')) {
   c = c.replace(/import \{(.*?)\} from "lucide-react"([^;]*)/, 'import { $1, Target } from "lucide-react"');
}

const dateStrReplacements = `
    // Trip stats
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6);

    const onTrip = allItineraries.filter((i: any) => i.status === 'post-ops');
    
    // Date Helpers
    const isDateEq = (dt: any, targetStr: any) => dt && new Date(dt).toISOString().split('T')[0] === targetStr;
    const isDateInWeek = (dt: any) => {
        if (!dt) return false;
        const d = new Date(dt);
        const ymd = new Date(d.toISOString().split('T')[0]);
        const s = new Date(startOfWeek.toISOString().split('T')[0]);
        const e = new Date(endOfWeek.toISOString().split('T')[0]);
        return ymd >= s && ymd <= e;
    };

    const startingToday = allItineraries.filter((i: any) => isDateEq(i.startDate, todayStr));
    const endingToday = allItineraries.filter((i: any) => isDateEq(i.endDate, todayStr));
    const startingTomorrow = allItineraries.filter((i: any) => isDateEq(i.startDate, tomorrowStr));
    const endingTomorrow = allItineraries.filter((i: any) => isDateEq(i.endDate, tomorrowStr));
    const startingThisWeek = allItineraries.filter((i: any) => isDateInWeek(i.startDate));

    const pendingPayments = allItineraries.filter(i => {`;

c = c.replace(/    \/\/ Trip stats\n    const todayStr = new Date\(\)[\s\S]*?const endingToday = allItineraries\.filter\(\(i: any\) => \{[\s\S]*?return end === todayStr\n    \}\)\n    const pendingPayments = allItineraries\.filter\(i => \{/, dateStrReplacements);

const newKpisInfo = `    const kpis = [
        { label: "Revenue", value: \\\`₹\${confirmedRevenue.toLocaleString()}\\\`, icon: DollarSign, color: "#f472b6" },
        { label: "Avg Deal", value: \\\`₹\${avgDeal.toLocaleString()}\\\`, icon: TrendingUp, color: "#f59e0b" },
        { label: "Total Users", value: users.length, icon: Users, color: "#8b5cf6" },
        { label: "Destinations", value: destinations.length, icon: MapPin, color: "#34d399" },
        { label: "Itineraries", value: allItineraries.length, icon: FileText, color: "#60a5fa" },
        { label: "Confirmed", value: confirmedItins.length, icon: CheckCircle, color: "#06a15c" },
        { label: "Sales Team", value: salesUsers.length, icon: Briefcase, color: "#a78bfa" },
    ]`;

c = c.replace(/    const kpis = \[\n(?:.*)\n(?:.*)\n(?:.*)\n(?:.*)\n(?:.*)\n(?:.*)\n(?:.*)\n    \]/, newKpisInfo.replace(/\\\\`/g, '`'));


const newTripKpisInfo = `    const tripKpis = [
        { label: "On-Trip Clients", value: onTrip.length, icon: Users, color: "#f59e0b" },
        { label: "Starting Today", value: startingToday.length, icon: Target, color: "#34d399" },
        { label: "Ending Today", value: endingToday.length, icon: MapPin, color: "#ef4444" },
        { label: "Starting Tomorrow", value: startingTomorrow.length, icon: Target, color: "#60a5fa" },
        { label: "Ending Tomorrow", value: endingTomorrow.length, icon: MapPin, color: "#f43f5e" },
        { label: "Starting This Week", value: startingThisWeek.length, icon: Target, color: "#8b5cf6" },
        { label: "Pending Payments", value: pendingPayments.length, icon: CreditCard, color: "#eab308" },
    ]`;

c = c.replace(/    const tripKpis = \[\n(?:.*)\n(?:.*)\n(?:.*)\n    \]/, newTripKpisInfo);

fs.writeFileSync('app/(dashboard)/admin/page.tsx', c, 'utf8');
console.log('Updated Admin panel');
