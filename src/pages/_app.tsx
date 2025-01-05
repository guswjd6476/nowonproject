import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }: AppProps) {
    const router = useRouter();
    console.log(router.pathname, 'router.pathname ');
    return (
        <div className="flex h-screen">
            {/* Sidebar Navigation */}
            <nav className="w-[140px] bg-gray-800 text-white p-4">
                <h1 className="text-lg font-bold mb-4">분석 메뉴</h1>
                <ul>
                    <li className="mb-2">
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
                    <li className="mb-2">
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
                </ul>
            </nav>

            {/* Main Content */}
            <div className="w-[calc(100%-140px)] bg-gray-100 p-6 overflow-y-auto">
                <Component {...pageProps} />
            </div>
        </div>
    );
}
