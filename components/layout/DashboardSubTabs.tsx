'use client';

export type SubTabItem<T extends string> = {
    id: T;
    label: string;
};

export function DashboardSubTabs<T extends string>({
    tabs,
    activeTab,
    onChange,
    columnClass = 'grid-cols-3',
    wrapperClassName = 'mb-6 grid border-b border-gray-200 bg-white',
}: {
    tabs: readonly SubTabItem<T>[];
    activeTab: T;
    onChange: (tab: T) => void;
    columnClass?: string;
    wrapperClassName?: string;
}) {
    return (
        <div className={wrapperClassName}>
            <div className={`grid w-full ${columnClass}`}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={`border-b-2 py-3 text-center text-sm transition-colors ${
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
