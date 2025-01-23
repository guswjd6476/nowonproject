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
    {
        name: '전체',
        items: [
            '구역예배',
            '구역모임',
            '귀소',
            '대회의',
            '십일조',
            '회비',
            '주일예배',
            '삼일예배',
            '총특교',
            '말노정',
            '지정교',
            '전도활동',
        ],
    },
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
            '8시': 3,
            정오: 3,
            '오후 3:30:00': 3,
            '19시': 3,
            '대체(대면)': 2,
            '당일 외 대면': 2,
            형제교회: 3,
            선교교회: 3,
            '대체(비대면)': 1,
            '대면 그외': 1,
            문자및전화: 0,
        },
        삼일예배: {
            정오: 3,
            '20시': 3,
            '21시': 3,
            '대체(대면)': 2,
            선교교회: 3,
            형제교회: 3,
            '당일 외 대면': 2,
            '대면 그외': 1,
            '대체(비대면)': 1,
            문자및전화: 0,
        },
    };

    return scores[serviceType]?.[value] || 0;
};
const getScoreForMeeting = (meetingType: string, value: string): number => {
    if (meetingType === '귀소' || meetingType === '대회의') {
        return value.startsWith('불참') ? 0 : 1;
    } else if (meetingType === '구역예배') {
        return value === '본구역예배' ? 1 : 0; // 본구역예배 = 참석, 그 외 = 불참
    } else if (meetingType === '구역모임') {
        return value === '1' ? 1 : 0; // 값이 1이면 참석, 0이면 불참
    } else if (meetingType === '총특교' || meetingType === '지정교') {
        const scores: Record<string, number> = {
            시청: 2,
            카드뉴스: 1,
            미시청: 0,
        };
        return scores[value] !== undefined ? scores[value] : 0; // 정의되지 않은 값은 기본적으로 0
    } else if (meetingType === '말노정') {
        return value === '1' ? 1 : 0; // 1이면 참석, 0이면 불참
    }
    return 0; // 기본 값
};

const getChartData = (data: SheetData[] | SheetData, sheetName: string) => {
    const labels: string[] = [];
    const values: number[] = [];

    const dataArray = Array.isArray(data) ? data : [data];

    dataArray.forEach((item) => {
        if (!item || !item.시트이름) return; // 데이터 유효성 검사

        Object.entries(item).forEach(([key, value]) => {
            if (key !== '시트이름' && (/\d{1,2}\/\d{1,2}$/.test(key) || /^[1-9]월|1[0-2]월$/.test(key))) {
                labels.push(key);

                // 점수 계산 통일화
                if (['주일예배', '삼일예배'].includes(sheetName)) {
                    values.push(getScoreForService(sheetName, value as string));
                } else {
                    values.push(getScoreForMeeting(sheetName, value as string));
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
                    // 선택된 탭에 맞는 시트 목록 가져오기
                    const selectedTabItems = TABS.find((tab) => tab.name === selectedTab)?.items || [];

                    // 여러 시트 데이터를 한번에 요청
                    const promises = selectedTabItems.map(async (sheetName) => {
                        const res = await fetch(`/api/googleSheet?name=${name}&sheet=${sheetName}`);
                        const data = await res.json();
                        return { sheetName, data: data.data };
                    });

                    const sheetData = await Promise.all(promises);

                    // 각 시트의 데이터를 합침
                    const mergedData: PersonData = sheetData.reduce((acc, { sheetName, data }) => {
                        acc[sheetName] = data;
                        return acc;
                    }, {} as PersonData);

                    setPersonData(mergedData);
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
    }, [name, selectedTab]);

    const filteredData =
        selectedTab === '전체'
            ? personData // 전체 탭일 때는 모든 데이터를 그대로 사용
            : Object.fromEntries(
                  Object.entries(personData || {}).filter(([sheetName]) =>
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
                {filteredData &&
                    Object.entries(filteredData).map(([sheetName, data]) => {
                        if (sheetName === '노원명단') return null;

                        return (
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
                                                legend: { position: 'top' as const }, // Using 'as const' ensures it's recognized as a valid literal type
                                                title: { display: true, text: `${sheetName} 그래프` },
                                            },
                                            scales: {
                                                y: {
                                                    min:
                                                        sheetName === '귀소' ||
                                                        sheetName === '대회의' ||
                                                        sheetName === '구역예배' ||
                                                        sheetName === '구역모임' ||
                                                        sheetName === '말노정' ||
                                                        sheetName === '총특교' ||
                                                        sheetName === '지정교' ||
                                                        sheetName === '주일예배' ||
                                                        sheetName === '삼일예배'
                                                            ? 0
                                                            : undefined,
                                                    max:
                                                        sheetName === '귀소' ||
                                                        sheetName === '대회의' ||
                                                        sheetName === '구역예배' ||
                                                        sheetName === '구역모임' ||
                                                        sheetName === '말노정'
                                                            ? 1
                                                            : sheetName === '총특교' || sheetName === '지정교'
                                                            ? 2
                                                            : sheetName === '주일예배' || sheetName === '삼일예배'
                                                            ? 3
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
                                                            : sheetName === '총특교' || sheetName === '지정교'
                                                            ? {
                                                                  stepSize: 1,
                                                                  callback: (value) =>
                                                                      value === 2
                                                                          ? '시청'
                                                                          : value === 1
                                                                          ? '카드뉴스'
                                                                          : '미시청',
                                                              }
                                                            : sheetName === '주일예배' || sheetName === '삼일예배'
                                                            ? {
                                                                  stepSize: 1,
                                                                  callback: (value) =>
                                                                      value === 3
                                                                          ? '대면예배'
                                                                          : value === 0
                                                                          ? '문자및전화'
                                                                          : value === 1
                                                                          ? '대체(비대면)'
                                                                          : '대체(대면)',
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
