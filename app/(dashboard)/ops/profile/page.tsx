"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { User, Mail, Phone, MapPin, Building2, Calendar, Target, Award, Shield } from "lucide-react"

export default function PreOpsProfilePage() {
    return (
        <ProtectedRoute allowedRoles={["pre_ops", "pre_ops_lead", "pre_ops_lead", "admin"]}>
            <ProfileContent />
        </ProtectedRoute>
    )
}

function ProfileContent() {
    const { userProfile } = useAuth()

    if (!userProfile) return null

    return (
        <div className="space-y-8 max-w-4xl max-w-5xl mx-auto pb-16">
            {/* Header / Banner */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-900 to-emerald-700 h-48 shadow-xl">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                <div className="absolute -bottom-12 left-8 flex items-end gap-6">
                    <div className="w-24 h-24 rounded-2xl bg-white shadow-xl flex items-center justify-center border-4 border-white overflow-hidden" style={{ background: '#f8fafc' }}>
                        {(userProfile as any).photoURL ? (
                            <img src={(userProfile as any).photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-12 h-12 text-emerald-800 opacity-20" />
                        )}
                    </div>
                </div>
            </div>

            {/* Profile Info */}
            <div className="pt-16 px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Personal Details */}
                <div className="lg:col-span-1 space-y-6">
                    <div>
                        <h1 className="font-serif text-3xl text-emerald-950 font-bold tracking-tight">{userProfile.name}</h1>
                        <p className="font-sans text-sm font-medium text-emerald-600 mt-1 uppercase tracking-widest">{userProfile.role.replace('_', ' ')}</p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-900/5 space-y-4">
                        <h3 className="font-sans text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Contact Information</h3>

                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                <Mail className="w-4 h-4 text-emerald-600" />
                            </div>
                            <span className="text-gray-700 font-medium truncate">{userProfile.email}</span>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                <Building2 className="w-4 h-4 text-emerald-600" />
                            </div>
                            <span className="text-gray-700 font-medium">{userProfile.employeeCode || "N/A"}</span>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                <Shield className="w-4 h-4 text-emerald-600" />
                            </div>
                            <span className="text-gray-700 font-medium capitalize">{userProfile.department || "Operations"} Department</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Stats & Badges */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-900/5 hover:-translate-y-1 transition-transform">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                                    <Target className="w-5 h-5 text-orange-500" />
                                </div>
                                <div>
                                    <p className="font-sans text-[10px] font-bold text-gray-400 uppercase tracking-widest">Processing Speed</p>
                                    <p className="font-serif text-2xl font-bold text-emerald-950">&lt; 2 Hrs</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-900/5 hover:-translate-y-1 transition-transform">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <Award className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="font-sans text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quality Score</p>
                                    <p className="font-serif text-2xl font-bold text-emerald-950">98%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-900/5">
                        <h3 className="font-sans text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Recent Achievements</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                <div className="w-12 h-12 flex-shrink-0 bg-yellow-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                    <span className="text-xl">🏆</span>
                                </div>
                                <div>
                                    <h4 className="font-sans text-sm font-bold text-emerald-950">Top Processor of the Month</h4>
                                    <p className="font-sans text-xs text-gray-500 mt-1">Processed the highest volume of itineraries with zero errors in Operations.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                <div className="w-12 h-12 flex-shrink-0 bg-purple-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                    <span className="text-xl">⚡</span>
                                </div>
                                <div>
                                    <h4 className="font-sans text-sm font-bold text-emerald-950">Speed Demon</h4>
                                    <p className="font-sans text-xs text-gray-500 mt-1">Maintained an average processing time of under 30 minutes for 100+ bookings.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
