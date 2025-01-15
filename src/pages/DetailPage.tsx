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
interface SheetData {
    시트이름: string;
    [key: string]: string | number;
}

interface PersonData {
    [sheetName: string]: SheetData[];
}

const TABS = [
    { name: '전체', items: [] },
    { name: '회의', items: ['귀소', '대회의'] },
    { name: '헌금', items: ['십일조', '회비'] },
    { name: '예배', items: ['주일예배', '삼일예배'] },
    { name: '전도활동', items: ['전도활동'] },
];

// 예배 관련 점수 계산 함수
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

const getChartData = (
    data: SheetData[] | SheetData, // data가 배열일 수도 있고, 객체일 수도 있음
    sheetName: string
) => {
    const labels: string[] = [];
    const values: number[] = [];

    // data가 배열이 아닌 경우 배열로 감싸서 처리
    const dataArray = Array.isArray(data) ? data : [data];

    // 배열을 순회하면서 데이터 처리
    dataArray.forEach((item) => {
        const sheetTitle = item.시트이름;

        // 각 객체에 대해 날짜와 월을 처리
        Object.entries(item).forEach(([key, value]) => {
            if (key !== '시트이름' && (/\d{1,2}\/\d{1,2}$/.test(key) || /^[1-9]월|1[0-2]월$/.test(key))) {
                labels.push(key);

                if (sheetTitle === '주일예배' || sheetTitle === '삼일예배') {
                    // 예배 관련 데이터일 경우
                    values.push(getScoreForService(sheetTitle, value as string));
                } else {
                    // 그 외의 데이터는 숫자로 변환
                    values.push(parseInt((value as string) || '0', 10));
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

const PersonDetailPage = () => {
    const router = useRouter();
    const { name } = router.query;
    const [personData, setPersonData] = useState<PersonData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedTab, setSelectedTab] = useState<string>('전체');

    useEffect(() => {
        if (name && selectedTab) {
            const fetchPersonData = async () => {
                try {
                    const res = await fetch(`/api/googleSheet?name=${name}&sheet=${selectedTab}`);
                    const data = await res.json();

                    if (data.ok) {
                        setPersonData(data.data);
                    }
                } catch (error) {
                    console.error('데이터 로딩 실패:', error);
                } finally {
                    setLoading(false);
                }
            };

            fetchPersonData();
        } else {
            setLoading(false);
        }
    }, [name, selectedTab]); // selectedTab을 의존성 배열에 추가

    // selectedTab에 맞는 데이터만 필터링하여 재렌더링
    const filteredData =
        selectedTab === '전체' || !personData
            ? personData
            : Object.fromEntries(
                  Object.entries(personData).filter(([sheetName]) =>
                      TABS.find((tab) => tab.name === selectedTab)?.items.includes(sheetName)
                  )
              );

    if (loading) return <div className="text-center py-10 text-xl">Loading...</div>;

    if (!personData) {
        return <div>데이터를 찾을 수 없습니다.</div>;
    }

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
                {/* null 체크 추가 */}
                {filteredData &&
                    Object.entries(filteredData).map(([sheetName, data]) => {
                        // "노원명단" 시트는 제외
                        if (sheetName === '노원명단') return null;

                        return (
                            <div key={sheetName} className="bg-white p-4 rounded-lg shadow-md">
                                <h2 className="text-2xl font-semibold text-gray-800 mb-4">{sheetName}</h2>

                                <div className="mt-6">
                                    <h3 className="text-lg font-bold text-gray-700 mb-3">그래프</h3>
                                    <Line
                                        data={getChartData(data, sheetName)} // sheetName을 직접 사용
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
                        );
                    })}
            </div>
        </div>
    );
};

export default PersonDetailPage;
