'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type AdminDeepLinkProps = {
    children: ReactNode;
    onNavigate: () => void | Promise<void>;
    className?: string;
    title?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'>;

/** 관리자 패널 간 이동용 텍스트 링크 */
export function AdminDeepLink({
    children,
    onNavigate,
    className = '',
    title,
    ...rest
}: AdminDeepLinkProps) {
    return (
        <button
            type="button"
            title={title}
            className={`text-left text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline ${className}`}
            onClick={() => void onNavigate()}
            {...rest}
        >
            {children}
        </button>
    );
}
