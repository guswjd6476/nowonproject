import { useEffect, useState } from 'react';

type RowData = {
    지역: string;
    구역: string;
    이름: string;
    직책: string;
    createdAt: string;
};

export default function Home() {
    const [data, setData] = useState<RowData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/googleSheet');
                const json = await res.json();
                if (json.ok) {
                    console.log(json.data); // 전체 데이터 확인을 위한 로그 추가
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
        <div className="container mx-auto mt-10">
            <h1 className="text-2xl font-bold mb-4">노원명단</h1>
            <table className="table-auto border-collapse border border-gray-200 w-full text-left">
                <thead>
                    <tr>
                        <th className="border border-gray-300 px-4 py-2">지역</th>
                        <th className="border border-gray-300 px-4 py-2">구역</th>
                        <th className="border border-gray-300 px-4 py-2">이름</th>
                        <th className="border border-gray-300 px-4 py-2">직책</th>
                        <th className="border border-gray-300 px-4 py-2">Created At</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, index) => (
                        <tr key={index}>
                            <td className="border border-gray-300 px-4 py-2">{row.지역}</td>
                            <td className="border border-gray-300 px-4 py-2">{row.구역}</td>
                            <td className="border border-gray-300 px-4 py-2">{row.이름}</td>
                            <td className="border border-gray-300 px-4 py-2">{row.직책}</td>
                            <td className="border border-gray-300 px-4 py-2">{row.createdAt}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
