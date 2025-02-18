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
    ChartDataset,
} from 'chart.js';
import { excludedTimesAndPlaces } from '@/lib/datas';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

type Member = {
    이름: string;
    구역: string;
    직책: string;
    [key: string]: string; // 날짜별 출석 정보 포함
};

type TeamAttendanceByDate = {
    [date: string]: Record<string, number[]>; // 날짜별 팀별 참석 여부 저장
};

// 회의별 점수 계산 함수
const getScoreForMeeting = (meetingType: string, value: string): number => {
    let attendance = 0; // 기본적으로 불참(0)으로 설정

    if (meetingType === '귀소' || meetingType === '대회의') {
        attendance = value.startsWith('불참') ? 0 : 1;
    } else if (meetingType === '구역예배') {
        attendance = value === '본구역예배' ? 1 : 0; // 본구역예배 = 참석, 그 외 = 불참
    } else if (meetingType === '총특교' || meetingType === '지정교') {
        attendance = value === '미시청' ? 0 : 1; // 미시청 = 불참, 그 외 = 참석
    } else if (meetingType === '주일예배' || meetingType === '삼일예배') {
        attendance = excludedTimesAndPlaces.includes(value) ? 1 : 0; // 정해진 시간에 참석하면 1, 아니면 0
    } else if (meetingType === '말노정' || meetingType === '구역모임') {
        attendance = value === '1' ? 1 : 0; // 값이 1이면 참석, 아니면 불참
    } else {
        attendance = value === '참석' ? 1 : 0; // 기본적으로 참석 여부는 '참석'이면 1, 아니면 0
    }

    return attendance;
};

const Groups = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [chartData, setChartData] = useState<ChartData<'line'>>({ labels: [], datasets: [] });
    const [selectedCategory, setSelectedCategory] = useState<string>('구역예배');
    const [selectedZone, setSelectedZone] = useState<string | null>(null);
    const [subZones, setSubZones] = useState<string[]>([]);
    const [selectedSubZone, setSelectedSubZone] = useState<string | null>(null);
    const [showMembers, setShowMembers] = useState<boolean>(false); // 멤버별 참석 여부 표시 여부

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
                const memberAttendanceByDate: Record<string, Record<string, number[]>> = {};

                const allDates = Array.from(
                    new Set(
                        categoryData.flatMap((entry) =>
                            Object.keys(entry).filter(
                                (key) => !['이름', '구역', '구분', '직책', 'ID', '시트이름'].includes(key)
                            )
                        )
                    )
                ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

                categoryData.forEach((entry) => {
                    const team = entry.구역?.split('-')[0];
                    const subZone = entry.구역;
                    const memberName = entry.이름;

                    if (!team || !subZone) return;

                    // 구역별 참석 여부 계산
                    allDates.forEach((date) => {
                        const attendance = getScoreForMeeting(selectedCategory, entry[date]);
                        if (!teamAttendanceByDate[date]) teamAttendanceByDate[date] = {};
                        if (!teamAttendanceByDate[date][subZone]) teamAttendanceByDate[date][subZone] = [];
                        teamAttendanceByDate[date][subZone].push(attendance);

                        // 멤버별 참석 여부 계산
                        if (!memberAttendanceByDate[date]) memberAttendanceByDate[date] = {};
                        if (!memberAttendanceByDate[date][memberName]) memberAttendanceByDate[date][memberName] = [];
                        memberAttendanceByDate[date][memberName].push(attendance);
                    });
                });

                // 선택된 구역에 해당하는 서브존 필터링
                const filteredZones = selectedZone
                    ? Object.keys(teamAttendanceByDate[allDates[0]] || {}).filter((subZone) =>
                          subZone.startsWith(selectedZone)
                      )
                    : [];

                setSubZones(filteredZones);

                const datasets = showMembers
                    ? Object.keys(memberAttendanceByDate[allDates[0]] || {}).reduce((acc, member) => {
                          const memberInSubZone =
                              selectedSubZone &&
                              categoryData.some((entry) => entry.구역 === selectedSubZone && entry.이름 === member);
                          if (!memberInSubZone) return acc; // 해당 구역의 멤버가 아니면 제외
                          acc.push({
                              label: member,
                              data: allDates.map((date) => {
                                  const attendanceValues = memberAttendanceByDate[date]?.[member] || [];
                                  const attendedCount = attendanceValues.reduce((acc, val) => acc + val, 0);
                                  return attendanceValues.length > 0 ? attendedCount : 0; // 참석 횟수 계산
                              }),
                              borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
                              fill: false,
                              tension: 0.1,
                          });
                          return acc;
                      }, [] as ChartData<'line'>['datasets'])
                    : (selectedSubZone ? [selectedSubZone] : filteredZones).map((zone) => {
                          const zoneMembers = categoryData.filter((entry) => entry.구역 === zone).length; // 구역의 총 인원 수
                          return {
                              label: zone,
                              data: allDates.map((date) => {
                                  const attendanceValues = teamAttendanceByDate[date]?.[zone] || [];
                                  const totalAttendances = attendanceValues.length;
                                  const attendedCount = attendanceValues.reduce((acc, val) => acc + val, 0);
                                  return totalAttendances > 0 ? attendedCount / zoneMembers : 0; // 총 인원 수로 나누어 참석률 계산
                              }),
                              borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
                              fill: false,
                              tension: 0.1,
                          };
                      });

                setChartData({
                    labels: allDates,
                    datasets: datasets as ChartDataset<'line', number[]>[], // 타입 명시적으로 지정
                });
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAndCalculateParticipation();
    }, [selectedCategory, selectedZone, selectedSubZone, showMembers]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">구역별 참석률</h1>
            <div className="mb-4">
                {['구역예배', '구역모임', '총특교', '지정교', '말노정', '귀소', '주일예배', '삼일예배'].map(
                    (category) => (
                        <button
                            key={category}
                            className={`px-4 py-2 text-white rounded-md mr-2 ${
                                selectedCategory === category ? 'bg-blue-600' : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                            onClick={() => setSelectedCategory(category)}
                        >
                            {category}
                        </button>
                    )
                )}
            </div>
            <div className="mb-4">
                {['1', '2', '3', '4'].map((zone) => (
                    <button
                        key={zone}
                        className={`px-4 py-2 text-white rounded-md mr-2 ${
                            selectedZone === zone ? 'bg-green-600' : 'bg-green-500 hover:bg-green-600'
                        }`}
                        onClick={() => {
                            setSelectedZone(zone); // 구역 선택
                            setSelectedSubZone(null); // 서브존 선택 초기화
                            setShowMembers(false); // 멤버별로 표시 안 함
                        }}
                    >
                        {zone}팀
                    </button>
                ))}
            </div>
            {selectedZone && (
                <div className="mb-4">
                    <button
                        className={`px-4 py-2 text-white rounded-md mr-2 ${
                            selectedSubZone === null ? 'bg-yellow-600' : 'bg-yellow-500 hover:bg-yellow-600'
                        }`}
                        onClick={() => setSelectedSubZone(null)} // 전체 구역을 표시하려면 null 설정
                    >
                        전체
                    </button>
                    {subZones.map((subZone) => (
                        <button
                            key={subZone}
                            className={`px-4 py-2 text-white rounded-md mr-2 ${
                                selectedSubZone === subZone ? 'bg-yellow-600' : 'bg-yellow-500 hover:bg-yellow-600'
                            }`}
                            onClick={() => {
                                setSelectedSubZone(subZone);
                                setShowMembers(true); // 멤버별 참석률 표시
                            }}
                        >
                            {subZone}
                        </button>
                    ))}
                </div>
            )}
            <div className="relative">
                <Line
                    data={chartData}
                    options={{
                        responsive: true,
                        plugins: {
                            title: {
                                display: true,
                                text: showMembers
                                    ? `${selectedSubZone} 멤버별 참석`
                                    : selectedSubZone
                                    ? `${selectedSubZone} 참석률`
                                    : selectedZone
                                    ? `${selectedZone}팀 전체 참석률`
                                    : '전체 참석률',
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
                                    text: '참석률',
                                },
                                ticks: {
                                    callback: (tickValue: string | number) => {
                                        if (typeof tickValue === 'number') {
                                            return `${Math.round(tickValue * 100)}%`;
                                        }
                                        return tickValue; // string인 경우 그대로 반환
                                    },
                                },
                            },
                        },
                    }}
                />
            </div>
        </div>
    );
};

export default Groups;
