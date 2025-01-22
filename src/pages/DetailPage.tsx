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
    { name: '구역운영', items: ['구역예배', '구역모임'] },
    { name: '회의', items: ['귀소', '대회의'] },
    { name: '헌금', items: ['십일조', '회비'] },
    { name: '예배', items: ['주일예배', '삼일예배'] },
    { name: '교육', items: ['총특교', '말노정', '지정교'] },
    { name: '전도활동', items: ['전도활동'] },
];

// 예배 관련 점수 계산 함수
const getScoreForService = (serviceType: string, value: string): number => {
    const scores: Record<string, Record<string, number>> = {
        주일예배: {
            '8시': 4,
            정오: 4,
            '오후 3:30:00': 4,
            '19시': 4,
            '대체(대면)': 3,
            '당일 외 대면': 3,
            형제교회: 3,
            선교교회: 3,
            '대체(비대면)': 2,
            '대면 그외': 2,
            문자및전화: 1,
        },
        삼일예배: {
            정오: 4,
            '20시': 4,
            '21시': 4,
            '대체(대면)': 3,
            선교교회: 3,
            형제교회: 3,
            '당일 외 대면': 3,
            '대면 그외': 2,
            '대체(비대면)': 2,
            문자및전화: 1,
        },
    };

    return scores[serviceType]?.[value] || 0;
};
const getScoreForMeeting = (meetingType: string, value: string): number => {
    if (meetingType === '귀소' || meetingType === '대회의') {
        return value.startsWith('불참') ? 0 : 1;
    }
    if (meetingType === '구역예배') {
        return value === '본구역예배' ? 1 : 0; // 본구역예배 = 참석, 그 외 = 불참
    }
    if (meetingType === '구역모임') {
        return value === '1' ? 1 : 0; // 값이 1이면 참석, 0이면 불참
    }
    if (meetingType === '총특교' || meetingType === '지정교') {
        const scores: Record<string, number> = {
            시청: 3,
            카드뉴스: 2,
            미시청: 0,
        };
        return scores[value] || 0;
    }
    if (meetingType === '말노정') {
        return value === '1' ? 1 : 0; // 1이면 참석, 0이면 불참
    }
    return 0; // 기본 값
};

const getChartData = (data: SheetData[] | SheetData, sheetName: string) => {
    const labels: string[] = [];
    const values: number[] = [];

    const dataArray = Array.isArray(data) ? data : [data];

    dataArray.forEach((item) => {
        const sheetTitle = item.시트이름;

        Object.entries(item).forEach(([key, value]) => {
            if (key !== '시트이름' && (/\d{1,2}\/\d{1,2}$/.test(key) || /^[1-9]월|1[0-2]월$/.test(key))) {
                labels.push(key);

                if (sheetTitle === '주일예배' || sheetTitle === '삼일예배') {
                    values.push(getScoreForService(sheetTitle, value as string));
                } else if (
                    sheetTitle === '귀소' ||
                    sheetTitle === '대회의' ||
                    sheetTitle === '구역예배' ||
                    sheetTitle === '구역모임' ||
                    sheetTitle === '말노정'
                ) {
                    values.push(getScoreForMeeting(sheetTitle, value as string));
                } else {
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
                                        data={getChartData(data, sheetName)}
                                        options={{
                                            responsive: true,
                                            plugins: {
                                                legend: { position: 'top' },
                                                title: { display: true, text: `${sheetName} 그래프` },
                                            },
                                            scales: {
                                                y: {
                                                    min:
                                                        sheetName === '귀소' ||
                                                        sheetName === '대회의' ||
                                                        sheetName === '구역예배' ||
                                                        sheetName === '구역모임' ||
                                                        sheetName === '말노정'
                                                            ? 0
                                                            : undefined,
                                                    max:
                                                        sheetName === '귀소' ||
                                                        sheetName === '대회의' ||
                                                        sheetName === '구역예배' ||
                                                        sheetName === '구역모임' ||
                                                        sheetName === '말노정'
                                                            ? 1
                                                            : undefined,
                                                    ticks:
                                                        sheetName === '귀소' ||
                                                        sheetName === '대회의' ||
                                                        sheetName === '구역예배' ||
                                                        sheetName === '구역모임' ||
                                                        sheetName === '말노정'
                                                            ? {
                                                                  stepSize: 1,
                                                                  callback: (value) => (value === 1 ? '참석' : '불참'),
                                                              }
                                                            : undefined,
                                                },
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
