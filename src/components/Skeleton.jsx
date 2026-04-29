import React from 'react';

// ─── Bloc animé de base ───────────────────────────────────────────────────────
export function SkeletonBlock({ className = '' }) {
    return (
        <div
            className={`bg-gray-200 rounded animate-pulse ${className}`}
        />
    );
}

// ─── Skeleton Dashboard (3 stats + 2 cartes) ─────────────────────────────────
export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <SkeletonBlock className="h-9 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <SkeletonBlock className="h-4 w-16" />
                                <SkeletonBlock className="h-9 w-10" />
                            </div>
                            <SkeletonBlock className="h-12 w-12 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2].map(i => (
                    <div key={i} className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center space-x-4">
                            <SkeletonBlock className="h-10 w-10 rounded-full" />
                            <div className="space-y-2 flex-1">
                                <SkeletonBlock className="h-5 w-32" />
                                <SkeletonBlock className="h-4 w-40" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Skeleton Tableau (liste d'élèves, matières...) ──────────────────────────
export function TableSkeleton({ rows = 5, cols = 4 }) {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <SkeletonBlock className="h-8 w-48" />
                <SkeletonBlock className="h-10 w-36 rounded-lg" />
            </div>
            {/* Filtre */}
            <SkeletonBlock className="h-10 w-64 rounded-lg" />
            {/* Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gray-100 px-6 py-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                    {Array.from({ length: cols }).map((_, i) => (
                        <SkeletonBlock key={i} className="h-4 w-20" />
                    ))}
                </div>
                <div className="divide-y divide-gray-200">
                    {Array.from({ length: rows }).map((_, i) => (
                        <div key={i} className="px-6 py-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                            {Array.from({ length: cols }).map((_, j) => (
                                <SkeletonBlock key={j} className={`h-5 ${j === cols - 1 ? 'w-12' : 'w-full'}`} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Skeleton Classes (grille de cartes) ─────────────────────────────────────
export function ClassesSkeleton({ count = 6 }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <SkeletonBlock className="h-8 w-48" />
                <SkeletonBlock className="h-10 w-40 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-md p-4">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <SkeletonBlock className="h-6 w-24" />
                                <SkeletonBlock className="h-4 w-16" />
                            </div>
                            <SkeletonBlock className="h-5 w-5 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Skeleton Saisie des notes ────────────────────────────────────────────────
export function GradesSkeleton({ students = 3, subjects = 4 }) {
    return (
        <div className="space-y-4">
            <SkeletonBlock className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SkeletonBlock className="h-10 rounded-lg" />
                <SkeletonBlock className="h-10 rounded-lg" />
            </div>
            {Array.from({ length: students }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <SkeletonBlock className="h-7 w-40" />
                        <SkeletonBlock className="h-7 w-24" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.from({ length: subjects }).map((_, j) => (
                            <div key={j} className="space-y-2">
                                <SkeletonBlock className="h-4 w-32" />
                                <SkeletonBlock className="h-10 rounded-lg" />
                                <SkeletonBlock className="h-9 rounded-lg" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Skeleton Bulletins ───────────────────────────────────────────────────────
export function BulletinsSkeleton({ count = 6 }) {
    return (
        <div className="space-y-4">
            <SkeletonBlock className="h-8 w-56" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SkeletonBlock className="h-10 rounded-lg" />
                <SkeletonBlock className="h-10 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-200">
                        <SkeletonBlock className="h-6 w-36 mb-3" />
                        <SkeletonBlock className="h-9 w-20 mb-1" />
                        <SkeletonBlock className="h-4 w-24 mb-4" />
                        <SkeletonBlock className="h-12 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Spinner simple centré ────────────────────────────────────────────────────
export function Spinner({ size = 'md', text = 'Chargement...' }) {
    const sizeClass = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg className={`animate-spin text-blue-600 ${sizeClass}`} viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {text && <p className="text-sm text-gray-500">{text}</p>}
        </div>
    );
}