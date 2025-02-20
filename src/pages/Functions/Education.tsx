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
import { AttendanceMatrixRow } from '@/lib/types';
import AttendanceTable from '@/components/AttendanceTable';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

type Member = {
    이름: string;
    구역: string;
    직책: string;
    [key: string]: string; // 날짜별 출석 정보 포함
};

type ViewType = 'chart' | 'table';

type TeamAttendanceByDate = {
    [date: string]: Record<string, number[]>; // 날짜별 팀별 참석 여부 저장
};

type ChartDataset = {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
};

const categories = ['구역예배', '총특교', '지정교', '말노정', '월정기교육'];

const Education = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [chartData, setChartData] = useState<ChartData<'line', number[], string>>({ labels: [], datasets: [] });
    const [attendanceMatrix, setAttendanceMatrix] = useState<AttendanceMatrixRow[]>([]); // 사용하기 위해 상태로 관리
    const [dates, setDates] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]);
    const [selectedView, setSelectedView] = useState<ViewType>('chart');
    const [includeCardNews, setIncludeCardNews] = useState<boolean>(false); // 카드뉴스 포함 여부
    const [includeInSiSen, setIncludeInSiSen] = useState<boolean>(false); // 인시센 포함 여부
    const [includeGuDuJeonDal, setIncludeGuDuJeonDal] = useState<boolean>(false); // 구두전달 포함 여부

    useEffect(() => {
        const fetchAndCalculateParticipation = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/googleSheet?sheet=${selectedCategory}`);
                const json = await res.json();

                if (!json.ok || !json.data) {
                    console.error('Invalid data structure:', json);
                    return;
                }

                const categoryData: Member[] = json.data;
                const teamAttendanceByDate: TeamAttendanceByDate = {};
                const dates = Array.from(
                    new Set(
                        json.data.flatMap((item: Member) =>
                            Object.keys(item).filter(
                                (key) =>
                                    key !== 'ID' &&
                                    key !== '구역' &&
                                    key !== '구분' &&
                                    key !== '시트이름' &&
                                    key !== '이름' &&
                                    key !== '직책' &&
                                    key !== '검색용'
                            )
                        )
                    )
                ) as string[];
                setDates(dates);
                const names = json.data.map((item: Member) => item.이름);

                const attendanceMatrix = names.map((name: string) => {
                    const row: AttendanceMatrixRow = { name };
                    // 구역 추가
                    const member = json.data.find((item: Member) => item.이름 === name);

                    row.구역 = member?.구역 || '-'; // 구역 정보가 없으면 기본값 '-' 설정

                    dates.forEach((date: string) => {
                        const status = member?.[date] || '불참';
                        row[date] = status;
                    });

                    return row;
                });
                setAttendanceMatrix(attendanceMatrix);
                const allDates = dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

                categoryData.forEach((entry: Member) => {
                    const team = entry.구역?.split('-')[0];
                    if (!team) return;

                    allDates.forEach((date: string) => {
                        const status = entry[date] || '';

                        let attendance = 0;

                        if (selectedCategory === '말노정') {
                            attendance = status === '1' ? 1 : 0;
                        } else if (selectedCategory === '구역예배') {
                            attendance = status.includes('본구역예배') ? 1 : 0;
                        } else if (selectedCategory === '총특교' || selectedCategory === '지정교') {
                            attendance = status === '시청' ? 1 : 0;
                            if (includeCardNews && status.includes('카드뉴스')) {
                                attendance = 1; // 카드뉴스 포함 시 참석 처리
                            }
                        } else if (selectedCategory === '월정기교육') {
                            attendance = status.includes('대면') ? 1 : 0;
                            if (includeCardNews && status.includes('카드뉴스')) {
                                attendance = 1; // 카드뉴스 포함 시 참석 처리
                            }
                            if (includeInSiSen && status.includes('인시센')) {
                                attendance = 1; // 인시센 포함 시 참석 처리
                            }
                            if (includeGuDuJeonDal && status.includes('구두전달')) {
                                attendance = 1; // 구두전달 포함 시 참석 처리
                            }
                        }

                        teamAttendanceByDate[date] = teamAttendanceByDate[date] || {};
                        teamAttendanceByDate[date][team] = teamAttendanceByDate[date][team] || [];
                        teamAttendanceByDate[date][team].push(attendance);
                    });
                });

                const teams = Array.from(
                    new Set(Object.values(teamAttendanceByDate).flatMap((t) => Object.keys(t)))
                ).sort();

                const teamColors: Record<string, string> = {
                    '1': 'rgb(239, 68, 68)', // Red
                    '2': 'rgb(59, 130, 246)', // Blue
                    '3': 'rgb(254, 202, 87)', // Yellow
                    '4': 'rgb(34, 197, 94)', // Green
                };

                const datasets: ChartDataset[] = teams.map((team) => ({
                    label: `팀 ${team}`,
                    data: allDates.map((date: string) => {
                        const attendanceValues = (teamAttendanceByDate[date]?.[team] || []) as number[];
                        const totalAttendances = attendanceValues.length;
                        const attendedCount = attendanceValues.reduce((acc, val) => acc + Number(val), 0);
                        return totalAttendances > 0 ? attendedCount / totalAttendances : 0;
                    }),
                    borderColor: teamColors[team] || `#${Math.floor(Math.random() * 16777215).toString(16)}`,
                    backgroundColor: teamColors[team]
                        ? `${teamColors[team]}80`
                        : `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(
                              Math.random() * 256
                          )}, 0.2)`,
                    tension: 0.1,
                }));

                setChartData({ labels: allDates, datasets });
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAndCalculateParticipation();
    }, [selectedCategory, includeCardNews, includeInSiSen, includeGuDuJeonDal]);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">교육과 - 팀별 참석률 분석</h1>

            <div className="mb-4">
                {categories.map((category) => (
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

            {/* 총특교, 지정교, 월정기교육 항목에 대한 체크박스 추가 */}
            {(selectedCategory === '총특교' || selectedCategory === '지정교') && (
                <div className="mb-4">
                    <label className="mr-2">카드뉴스 포함</label>
                    <input
                        type="checkbox"
                        checked={includeCardNews}
                        onChange={(e) => setIncludeCardNews(e.target.checked)}
                    />
                </div>
            )}

            {selectedCategory === '월정기교육' && (
                <div className="mb-4">
                    <label className="mr-2">카드뉴스 포함</label>
                    <input
                        type="checkbox"
                        checked={includeCardNews}
                        onChange={(e) => setIncludeCardNews(e.target.checked)}
                    />
                    <label className="mr-2">인시센 포함</label>
                    <input
                        type="checkbox"
                        checked={includeInSiSen}
                        onChange={(e) => setIncludeInSiSen(e.target.checked)}
                    />
                    <label className="mr-2">구두전달 포함</label>
                    <input
                        type="checkbox"
                        checked={includeGuDuJeonDal}
                        onChange={(e) => setIncludeGuDuJeonDal(e.target.checked)}
                    />
                </div>
            )}

            <div className="mb-4">
                <button
                    className={`px-4 py-2 rounded-md mr-2 ${
                        selectedView === 'chart' ? 'bg-green-600 text-white' : 'bg-gray-300'
                    }`}
                    onClick={() => setSelectedView('chart')}
                >
                    그래프 보기
                </button>
                <button
                    className={`px-4 py-2 rounded-md ${
                        selectedView === 'table' ? 'bg-green-600 text-white' : 'bg-gray-300'
                    }`}
                    onClick={() => setSelectedView('table')}
                >
                    표로 보기
                </button>
            </div>

            {selectedView === 'chart' ? (
                <>
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold">그래프</h2>
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
                                            callbacks: {
                                                label: (tooltipItem) => {
                                                    const { datasetIndex, dataIndex } = tooltipItem;
                                                    const team = chartData.datasets[datasetIndex]?.label?.split(' ')[1];
                                                    const attendance =
                                                        chartData.datasets[datasetIndex]?.data[dataIndex];
                                                    return `${team} 팀: ${
                                                        attendance ? (attendance * 100).toFixed(2) + '%' : '없음'
                                                    }`;
                                                },
                                            },
                                        },
                                    },
                                    scales: {
                                        y: {
                                            min: 0,
                                            max: 1,
                                            ticks: {
                                                callback: function (value) {
                                                    return Number(value) * 100 + '%';
                                                },
                                            },
                                        },
                                    },
                                }}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <AttendanceTable dates={dates} attendanceMatrix={attendanceMatrix} />
            )}
        </div>
    );
};

export default Education;
