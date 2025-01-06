import { useEffect, useState } from 'react';
import Link from 'next/link';

// 각 시트의 데이터 타입 정의
type RowData = Record<string, string>;

export default function Home() {
    const [data, setData] = useState<RowData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/googleSheet');
                const json = await res.json();
                if (json.ok) {
                    setData(json.data['노원명단']); // '노원명단' 시트의 데이터만 가져옵니다
                } else {
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <p>Loading...</p>;

    return (
        <div className="container mx-auto mt-10 px-4">
            <h1 className="text-2xl font-bold mb-4">노원명단</h1>
            <div className="overflow-x-auto">
                <table className="table-auto border-collapse border border-gray-200 w-full text-left">
                    <thead>
                        <tr>
                            {data.length > 0 &&
                                Object.keys(data[0]).map((header) => (
                                    <th
                                        key={header}
                                        className="border border-gray-300 px-4 py-2 text-sm sm:text-base"
                                    >
                                        {header}
                                    </th>
                                ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, index) => (
                            <tr key={index}>
                                {Object.values(row).map((value, idx) => {
                                    if (idx === 0) {
                                        // 첫 번째 열인 '이름' 열을 클릭 가능한 링크로 만들기
                                        return (
                                            <td
                                                key={idx}
                                                className="border border-gray-300 px-4 py-2 text-blue-500 cursor-pointer text-sm sm:text-base"
                                            >
                                                <Link href={`/DetailPage?name=${value}`}>
                                                    <a>{value}</a> {/* 이름 클릭 시 해당 사람 페이지로 이동 */}
                                                </Link>
                                            </td>
                                        );
                                    }
                                    return (
                                        <td
                                            key={idx}
                                            className="border border-gray-300 px-4 py-2 text-sm sm:text-base"
                                        >
                                            {value}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
