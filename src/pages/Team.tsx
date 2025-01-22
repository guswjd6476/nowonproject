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
    ChartData,
} from 'chart.js';

// Chart.js 설정
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

type Member = {
    이름: string;
    구역: string;
    직책: string;
    [key: string]: string; // 날짜별 출석 정보 포함
};

type TeamAttendanceByDate = {
    [date: string]: Record<string, number[]>; // 날짜별 팀별 참석 여부를 저장
};

const Team = () => {
    const [loading, setLoading] = useState<boolean>(true); // 로딩 상태
    const [chartData, setChartData] = useState<ChartData<'line'>>({ labels: [], datasets: [] }); // 차트 데이터 상태
    const [selectedCategory, setSelectedCategory] = useState<string>('귀소'); // 선택된 카테고리 상태

    useEffect(() => {
        const fetchAndCalculateParticipation = async () => {
            try {
                const res = await fetch(`/api/googleSheet?sheet=${selectedCategory}`);
                const json = await res.json();

                if (!json.ok || !json.data) {
                    console.error('Invalid data structure:', json);
                    return;
                }

                const categoryData: Member[] = json.data;
                const teamAttendanceByDate: TeamAttendanceByDate = {};

                // 날짜 리스트 추출 (첫 번째 멤버의 날짜 키만 가져오기)
                const allDates = Array.from(
                    new Set(
                        categoryData.flatMap((entry) =>
                            Object.keys(entry).filter(
                                (key) =>
                                    key !== '이름' &&
                                    key !== '구역' &&
                                    key !== '구분' &&
                                    key !== '직책' &&
                                    key !== 'ID' &&
                                    key !== '시트이름' // Exclude unwanted fields
                            )
                        )
                    )
                ).sort((a, b) => {
                    // 날짜 형식으로 정렬
                    const dateA = new Date(a);
                    const dateB = new Date(b);
                    return dateA.getTime() - dateB.getTime();
                });

                categoryData.forEach((entry) => {
                    const team = entry.구역?.split('-')[0];
                    if (!team) return;

                    allDates.forEach((date) => {
                        let attendance = 0;

                        if (selectedCategory === '말노정' || selectedCategory === '구역모임') {
                            attendance = entry[date] === '1' ? 1 : 0;
                        } else if (selectedCategory === '구역예배') {
                            attendance = entry[date] === '본구역예배' ? 1 : 0;
                        } else if (selectedCategory === '총특교' || selectedCategory === '지정교') {
                            attendance = entry[date] === '미시청' ? 0 : 1;
                        } else if (selectedCategory === '주일예배' || selectedCategory === '삼일예배') {
                            const validTimes = ['8시', '정오', '오후 3:30:00', '19시', '20시', '21시'];
                            attendance = validTimes.includes(entry[date]) ? 1 : 0;
                        } else {
                            attendance = entry[date] === '참석' ? 1 : 0;
                        }

                        if (!teamAttendanceByDate[date]) teamAttendanceByDate[date] = {};
                        if (!teamAttendanceByDate[date][team]) teamAttendanceByDate[date][team] = [];
                        teamAttendanceByDate[date][team].push(attendance);
                    });
                });

                // 팀 추출
                const teams = Array.from(
                    new Set(Object.values(teamAttendanceByDate).flatMap((teamData) => Object.keys(teamData)))
                ).sort();

                // 팀별 데이터 세팅
                const teamColors: Record<string, string> = {
                    '1': 'red',
                    '2': 'blue',
                    '3': 'yellow',
                    '4': 'green',
                };

                const datasets = teams.map((team) => ({
                    label: `팀 ${team}`,
                    data: allDates.map((date) => {
                        const attendanceValues = teamAttendanceByDate[date]?.[team] || [];
                        const totalAttendances = attendanceValues.length;
                        const attendedCount = attendanceValues.reduce((acc, val) => acc + val, 0);
                        return totalAttendances > 0 ? attendedCount / totalAttendances : 0;
                    }),
                    borderColor: teamColors[team] || `#${Math.floor(Math.random() * 16777215).toString(16)}`,
                    fill: false,
                    tension: 0.1,
                }));

                setChartData({
                    labels: allDates,
                    datasets,
                });
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAndCalculateParticipation();
    }, [selectedCategory]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">팀별 참석률</h1>
            <div className="mb-4">
                {[
                    '구역예배',
                    '구역모임',
                    '총특교',
                    '지정교',
                    '말노정',
                    '대회의',
                    '귀소',
                    '주일예배',
                    '삼일예배',
                    '십일조',
                    '회비',
                ].map((category) => (
                    <button
                        key={category}
                        className={`px-4 py-2 text-white rounded-md mr-2 ${
                            selectedCategory === category ? 'bg-blue-600' : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                        onClick={() => setSelectedCategory(category)}
                    >
                        {category}
                    </button>
                ))}
            </div>
            <div className="relative">
                <Line
                    data={chartData}
                    options={{
                        responsive: true,
                        plugins: {
                            title: {
                                display: true,
                                text: '팀별 참석률',
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                            },
                        },
                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text: '날짜',
                                },
                            },
                            y: {
                                title: {
                                    display: true,
                                    text: '참석률 (%)',
                                },
                                min: 0,
                                max: 1,
                                ticks: {
                                    callback: (value) => `${(value as number) * 100}%`,
                                },
                            },
                        },
                    }}
                />
            </div>
        </div>
    );
};

export default Team;
