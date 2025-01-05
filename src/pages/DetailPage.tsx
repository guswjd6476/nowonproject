import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

// 각 시트의 데이터 타입 정의
interface PersonData {
    [sheetName: string]: Array<Record<string, string>>;
}

const PersonDetailPage = () => {
    const router = useRouter();
    const { name } = router.query; // URL에서 이름을 가져옵니다
    const [personData, setPersonData] = useState<PersonData | null>(null); // PersonData 타입을 명시
    const [loading, setLoading] = useState<boolean>(true); // 로딩 상태 추가
    const [error, setError] = useState<string | null>(null); // 에러 상태 추가

    useEffect(() => {
        if (name) {
            async function fetchPersonData() {
                try {
                    const res = await fetch(`/api/googleSheet?name=${name}`);
                    const data = await res.json();
                    if (data.ok) {
                        setPersonData(data.data); // 타입을 PersonData로 자동 추론
                    } else {
                        setError(data.error || 'Failed to load person data');
                    }
                } catch (err) {
                    setError('An error occurred while fetching data');
                } finally {
                    setLoading(false);
                }
            }

            fetchPersonData();
        } else {
            setLoading(false); // name이 없을 경우 로딩 종료
            setError('No name provided');
        }
    }, [name]);

    if (loading) return <div className="text-center py-10 text-xl">Loading...</div>;
    if (error) return <div className="text-center py-10 text-xl text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold text-center mb-6">{name}의 상세 정보</h1>
            <div className="space-y-6">
                {Object.entries(personData!).map(([sheetName, data]) => (
                    <div
                        key={sheetName}
                        className="bg-white p-4 rounded-lg shadow-md"
                    >
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">{sheetName}</h2>
                        <ul className="space-y-4">
                            {data.map((item, index) => (
                                <li
                                    key={index}
                                    className="bg-gray-100 p-4 rounded-lg shadow-sm"
                                >
                                    {Object.entries(item).map(([key, value]) => (
                                        <p
                                            key={key}
                                            className="text-gray-700"
                                        >
                                            <strong className="font-medium">{key}</strong>: {value}
                                        </p>
                                    ))}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PersonDetailPage;
