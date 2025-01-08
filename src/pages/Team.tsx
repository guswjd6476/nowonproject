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

// Chart.js 설정
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

type Member = {
    이름: string;
    구역: string;
    직책: string;
    [key: string]: string; // 날짜별 출석 정보가 여기에 포함됨
};

type TeamAttendanceByDate = {
    [date: string]: Record<string, number[]>; // 날짜별 팀별 참석 여부를 저장
};

type TeamParticipation = {
    team: string;
    date: string;
    attendanceRate: number;
};

const Team = () => {
    const [data, setData] = useState<Member[]>([]); // 데이터 상태
    const [teamData, setTeamData] = useState<TeamParticipation[]>([]); // 팀별 참여율 데이터
    const [loading, setLoading] = useState<boolean>(true); // 로딩 상태
    const [chartData, setChartData] = useState<any>(null); // 차트 데이터 상태
    const [selectedCategory, setSelectedCategory] = useState<string>('귀소'); // 선택된 카테고리 상태

    useEffect(() => {
        async function fetchAndCalculateParticipation() {
            try {
                const res = await fetch(`/api/googleSheet`);
                const data = await res.json();

                // Log the data to verify its structure
                console.log('귀소 데이터:', data.data);

                // Ensure data is structured correctly
                if (data.data && Array.isArray(data.data[selectedCategory])) {
                    const teamAttendanceByDate: TeamAttendanceByDate = {}; // 날짜별 팀별 참석 여부

                    data.data[selectedCategory].forEach((entry: any) => {
                        console.log('처리 중인 entry:', entry); // 각 entry 출력
                        const zone = entry.구역;
                        if (!zone) {
                            console.warn('Missing 구역 value for entry:', entry); // 구역 값이 없을 경우 경고
                            return; // 구역 값이 없으면 해당 entry를 건너뜁니다.
                        }

                        const team = zone.split('-')[0]; // 구역을 통해 팀을 정의 (예: '1-1' -> 팀 1)

                        // 각 날짜에 대한 참석 값들 추출
                        Object.keys(entry).forEach((key) => {
                            if (key !== '이름' && key !== '구역' && key !== '직책') {
                                const date = key; // 날짜
                                const attendance = entry[key] === '1' ? 1 : 0;

                                // 날짜별로 팀별 참석 여부 기록
                                if (!teamAttendanceByDate[date]) {
                                    teamAttendanceByDate[date] = {};
                                }
                                if (!teamAttendanceByDate[date][team]) {
                                    teamAttendanceByDate[date][team] = [];
                                }
                                teamAttendanceByDate[date][team].push(attendance);
                            }
                        });
                    });

                    // Log the filled teamAttendanceByDate object
                    console.log('teamAttendanceByDate:', teamAttendanceByDate);

                    // 날짜별로 팀별 평균 참석률 계산
                    const calculatedTeamData: TeamParticipation[] = [];
                    Object.keys(teamAttendanceByDate).forEach((date) => {
                        console.log('처리 중인 날짜:', date); // 처리 중인 날짜 출력
                        Object.keys(teamAttendanceByDate[date]).forEach((team) => {
                            const attendanceValues = teamAttendanceByDate[date][team];
                            const totalAttendances = attendanceValues.length;
                            const attendedCount = attendanceValues.reduce((acc, val) => acc + val, 0);
                            const attendanceRate = totalAttendances > 0 ? attendedCount / totalAttendances : 0;

                            calculatedTeamData.push({
                                team,
                                date,
                                attendanceRate,
                            });
                        });
                    });

                    setTeamData(calculatedTeamData);

                    // Check if the data is being calculated
                    console.log('calculatedTeamData:', calculatedTeamData); // 최종 계산된 데이터 출력

                    // 차트 데이터 준비
                    const dates = Object.keys(teamAttendanceByDate);
                    if (dates.length === 0) {
                        console.error('No dates found in teamAttendanceByDate');
                        return; // 날짜가 없으면 차트 생성을 중지
                    }

                    const teams = Object.keys(teamAttendanceByDate[dates[0]]);
                    if (teams.length === 0) {
                        console.error('No teams found for the first date');
                        return; // 팀이 없으면 차트 생성을 중지
                    }

                    const datasets = teams.map((team) => {
                        const data = dates.map((date) => {
                            const teamAttendance = teamAttendanceByDate[date][team] || [];
                            const totalAttendances = teamAttendance.length;
                            const attendedCount = teamAttendance.reduce((acc, val) => acc + val, 0);
                            return totalAttendances > 0 ? attendedCount / totalAttendances : 0;
                        });

                        return {
                            label: team,
                            data,
                            fill: false,
                            borderColor: '#' + Math.floor(Math.random() * 16777215).toString(16), // 랜덤 색상
                            tension: 0.1,
                        };
                    });

                    setChartData({
                        labels: dates,
                        datasets,
                    });
                } else {
                    console.error('Expected an object but got:', data.data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        fetchAndCalculateParticipation();
    }, [selectedCategory]); // selectedCategory가 변경될 때마다 재실행

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">팀별 참석률</h1>
            <div className="mb-4">
                <button
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    onClick={() => setSelectedCategory('귀소')}
                >
                    귀소
                </button>
                <button
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 ml-2"
                    onClick={() => setSelectedCategory('대회의')}
                >
                    대회의
                </button>
                <button
                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 ml-2"
                    onClick={() => setSelectedCategory('말노정')}
                >
                    말노정
                </button>
                <button
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 ml-2"
                    onClick={() => setSelectedCategory('십일조')}
                >
                    십일조
                </button>
                <button
                    className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 ml-2"
                    onClick={() => setSelectedCategory('회비')}
                >
                    회비
                </button>
            </div>
            {chartData ? (
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
                                    ticks: {
                                        autoSkip: true,
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
                                        callback: function (value: number | string) {
                                            return typeof value === 'number' ? (value * 100).toFixed(2) + '%' : value;
                                        },
                                    },
                                },
                            },
                        }}
                    />
                </div>
            ) : (
                <div>Loading chart...</div>
            )}
        </div>
    );
};

export default Team;
