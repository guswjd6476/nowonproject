import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';

export default function App({ Component, pageProps }: AppProps) {
    const router = useRouter();

    // 현재 경로가 '/Functions' 또는 하위 경로인지 확인
    const isFunctionsOpen = useMemo(() => router.pathname.startsWith('/Functions'), [router.pathname]);
    const [manualOpen, setManualOpen] = useState(false);

    // 실제 열림 여부를 결정 (자동 열림과 수동 토글을 함께 반영)
    const isMenuOpen = isFunctionsOpen || manualOpen;

    return (
        <div className="flex h-screen">
            {/* Sidebar Navigation */}
            <nav className="w-[140px] bg-gray-800 text-white p-4">
                <h1 className="text-lg font-bold mb-4">분석 메뉴</h1>
                <ul>
                    <li>
                        <Link href="/Region">
                            <span
                                className={`block p-2 rounded ${
                                    router.pathname === '/Region' ? 'bg-gray-700' : 'hover:bg-gray-600'
                                }`}
                            >
                                지역별 분석
                            </span>
                        </Link>
                    </li>
                    <li>
                        {/* Functions 메뉴 */}
                        <button
                            className={`w-full text-left block p-2 rounded ${
                                isMenuOpen ? 'bg-gray-700' : 'hover:bg-gray-600'
                            }`}
                            onClick={() => setManualOpen(!manualOpen)}
                        >
                            기능별 분석
                        </button>
                        {isMenuOpen && (
                            <ul className="ml-4 mt-2 space-y-1">
                                {[
                                    { href: '/Functions/Planning', label: '기획과' },
                                    { href: '/Functions/Education', label: '교육과' },
                                    { href: '/Functions/Evangelism', label: '전도과' },
                                    { href: '/Functions/Visitation', label: '심방과' },
                                    { href: '/Functions/Accounting', label: '회계' },
                                ].map(({ href, label }) => (
                                    <li key={href}>
                                        <Link href={href}>
                                            <span
                                                className={`block p-2 rounded ${
                                                    router.pathname === href ? 'bg-gray-700' : 'hover:bg-gray-600'
                                                }`}
                                            >
                                                {label}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                    <li>
                        <Link href="/Team">
                            <span
                                className={`block p-2 rounded ${
                                    router.pathname === '/Team' ? 'bg-gray-700' : 'hover:bg-gray-600'
                                }`}
                            >
                                팀별 분석
                            </span>
                        </Link>
                    </li>
                    <li>
                        <Link href="/Groups">
                            <span
                                className={`block p-2 rounded ${
                                    router.pathname === '/Groups' ? 'bg-gray-700' : 'hover:bg-gray-600'
                                }`}
                            >
                                구역별 분석
                            </span>
                        </Link>
                    </li>
                    <li>
                        <Link href="/">
                            <span
                                className={`block p-2 rounded ${
                                    router.pathname === '/' ? 'bg-gray-700' : 'hover:bg-gray-600'
                                }`}
                            >
                                개별 분석
                            </span>
                        </Link>
                    </li>
                </ul>
            </nav>

            {/* Main Content */}
            <div className="w-[calc(100%-140px)] bg-gray-100 p-6 overflow-y-auto">
                <Component {...pageProps} />
            </div>
        </div>
    );
}
