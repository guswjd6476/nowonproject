import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// 데이터 타입 정의
interface PersonData {
    [sheetName: string]: Array<Record<string, any>>;
}

const TABS = [
    { name: '전체', items: [] },
    { name: '회의', items: ['귀소', '대회의'] },
    { name: '헌금', items: ['십일조', '회비'] },
    { name: '예배', items: ['주일예배', '삼일예배'] },
    { name: '전도활동', items: ['전도활동'] },
];

// 점수 계산 함수
const getScoreForService = (serviceType: string, value: string): number => {
    const scores: Record<string, Record<string, number>> = {
        주일예배: {
            '8시': 4,
            정오: 4,
            '15시': 4,
            '19시': 4,
            '대체(대면)': 3,
            '대체(비대면)': 2,
            '문자(전화)': 1,
        },
        삼일예배: {
            정오: 4,
            '20시': 4,
            '21시': 4,
            '대체(대면)': 3,
            '대체(비대면)': 2,
            '문자(전화)': 1,
        },
    };

    return scores[serviceType]?.[value] || 0;
};

const PersonDetailPage = () => {
    const router = useRouter();
    const { name } = router.query;
    const [personData, setPersonData] = useState<PersonData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedTab, setSelectedTab] = useState<string>('전체');

    useEffect(() => {
        if (name) {
            async function fetchPersonData() {
                try {
                    const res = await fetch(`/api/googleSheet?name=${name}`);
                    const data = await res.json();
                    if (data.ok) {
                        setPersonData(data.data);
                    }
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            }

            fetchPersonData();
        } else {
            setLoading(false);
        }
    }, [name]);

    // 데이터를 선택된 탭에 따라 필터링
    const filterData = (data: PersonData) => {
        if (selectedTab === '전체') return data;
        const tab = TABS.find((tab) => tab.name === selectedTab);
        const filteredItems = tab?.items || [];
        return Object.fromEntries(Object.entries(data).filter(([sheetName]) => filteredItems.includes(sheetName)));
    };

    const getChartData = (data: Array<Record<string, any>>, sheetName: string) => {
        const labels: string[] = [];
        const values: number[] = [];

        data.forEach((item) => {
            Object.entries(item).forEach(([key, value]) => {
                // 날짜 형식과 "1월", "2월", "3월" 형식을 처리
                if (/^\d{1,2}\/\d{1,2}$/.test(key) || /^[1-9]월|1[0-2]월$/.test(key)) {
                    labels.push(key);
                    if (sheetName === '주일예배' || sheetName === '삼일예배') {
                        values.push(getScoreForService(sheetName, value));
                    } else {
                        values.push(parseInt(value || '0', 10));
                    }
                }
            });
        });

        return {
            labels,
            datasets: [
                {
                    label: `${sheetName} 점수`,
                    data: values,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderWidth: 2,
                },
            ],
        };
    };

    if (loading) return <div className="text-center py-10 text-xl">Loading...</div>;

    const filteredData = personData ? filterData(personData) : null;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold text-center mb-6">{name}의 상세 정보</h1>

            <div className="flex justify-center mb-6 space-x-4">
                {TABS.map((tab) => (
                    <button
                        key={tab.name}
                        onClick={() => setSelectedTab(tab.name)}
                        className={`px-4 py-2 rounded-lg ${
                            selectedTab === tab.name ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
                        }`}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>

            <div className="space-y-6">
                {filteredData &&
                    Object.entries(filteredData).map(([sheetName, data]) => (
                        <div
                            key={sheetName}
                            className="bg-white p-4 rounded-lg shadow-md"
                        >
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">{sheetName}</h2>

                            <div className="mt-6">
                                <h3 className="text-lg font-bold text-gray-700 mb-3">그래프</h3>
                                <Line
                                    data={getChartData(data, sheetName)}
                                    options={{
                                        responsive: true,
                                        plugins: {
                                            legend: { position: 'top' },
                                            title: { display: true, text: `${sheetName} 점수 그래프` },
                                        },
                                    }}
                                />
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
};

export default PersonDetailPage;
