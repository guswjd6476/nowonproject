import { useEffect, useState } from 'react';
import Link from 'next/link';

// 각 시트의 데이터 타입 정의
type RowData = Record<string, string>;

export default function Home() {
    const [data, setData] = useState<RowData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/googleSheet');
                const json = await res.json();
                if (json.ok) {
                    setData(json.data['노원명단']); // '노원명단' 시트의 데이터만 가져옵니다
                } else {
                    setError(json.error || 'Failed to load data');
                }
            } catch (err) {
                setError('An error occurred while fetching data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div className="container mx-auto mt-10">
            <h1 className="text-2xl font-bold mb-4">노원명단</h1>
            <table className="table-auto border-collapse border border-gray-200 w-full text-left">
                <thead>
                    <tr>
                        {data.length > 0 &&
                            Object.keys(data[0]).map((header) => (
                                <th
                                    key={header}
                                    className="border border-gray-300 px-4 py-2"
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
                                            className="border border-gray-300 px-4 py-2 text-blue-500 cursor-pointer"
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
                                        className="border border-gray-300 px-4 py-2"
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
    );
}
