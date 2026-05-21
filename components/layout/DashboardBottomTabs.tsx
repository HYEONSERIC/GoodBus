'use client';

export type BottomTabItem<T extends string> = {
    id: T;
    label: string;
};

export function DashboardBottomTabs<T extends string>({
    tabs,
    activeTab,
    onChange,
    columnClass = 'grid-cols-4',
}: {
    tabs: readonly BottomTabItem<T>[];
    activeTab: T;
    onChange: (tab: T) => void;
    columnClass?: string;
}) {
    return (
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur">
            <div className={`mx-auto grid w-full max-w-xl ${columnClass}`}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={`border-b-2 py-3 text-center text-xs transition-colors sm:text-sm ${
                            activeTab === tab.id
                                ? 'border-gray-900 font-semibold text-gray-900'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
