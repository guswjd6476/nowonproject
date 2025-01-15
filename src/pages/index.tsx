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
                const res = await fetch('/api/googleSheet?sheet=노원명단'); // '노원명단' 시트만 요청
                const json = await res.json();
                if (json.ok) {
                    setData(json.data); // API 응답 데이터 설정
                } else {
                    console.error('Error fetching data:', json.error);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
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
                                    <th key={header} className="border border-gray-300 px-4 py-2 text-sm sm:text-base">
                                        {header}
                                    </th>
                                ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, index) => (
                            <tr key={index}>
                                {Object.entries(row).map(([key, value]) => {
                                    if (key === '이름') {
                                        return (
                                            <td
                                                key={key}
                                                className="border border-gray-300 px-4 py-2 text-blue-500 cursor-pointer text-sm sm:text-base"
                                            >
                                                <Link href={`/DetailPage?name=${value}`}>{value}</Link>
                                            </td>
                                        );
                                    }
                                    return (
                                        <td key={key} className="border border-gray-300 px-4 py-2 text-sm sm:text-base">
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
