import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { CalendarCheck, Mail, Users, ArrowRight } from "lucide-react";

export default async function AdminPage() {
  const [totalAppointments, pendingAppointments, totalMessages, totalUsers] =
    await Promise.all([
      prisma.appointment.count(),
      prisma.appointment.count({ where: { status: "PENDING" } }),
      prisma.contactMessage.count(),
      prisma.user.count(),
    ]);

  const stats = [
    {
      title: "Rendez-vous",
      value: totalAppointments,
      sub: `${pendingAppointments} en attente`,
      icon: CalendarCheck,
      href: "/admin/appointments",
      color: "text-blue-400",
    },
    {
      title: "Messages",
      value: totalMessages,
      sub: "Messages reçus",
      icon: Mail,
      href: "/admin/messages",
      color: "text-green-400",
    },
    {
      title: "Utilisateurs",
      value: totalUsers,
      sub: "Comptes connectés",
      icon: Users,
      href: "/admin/users",
      color: "text-purple-400",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Panneau Admin</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ title, value, sub, icon: Icon, href, color }) => (
          <Link key={title} href={href}>
            <Card className="bg-slate-900 border-slate-700 hover:border-slate-500 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-white">{value}</p>
                  <p className="text-xs text-slate-400 mt-1">{sub}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
