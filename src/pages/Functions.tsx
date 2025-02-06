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
    [date: string]: Record<string, number[]>; // 날짜별 팀별 참석 여부 저장
};

type DepartmentCategoryMap = {
    [department: string]: string[];
};

const departmentCategories: DepartmentCategoryMap = {
    기획과: ['대회의', '귀소'],
    교육과: ['구역예배', '총특교', '지정교', '말노정'],
    전도과: ['전도활동'],
    심방과: ['주일예배', '삼일예배', '구역모임'],
    회계: ['십일조', '회비'],
};

const Functions = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [chartData, setChartData] = useState<ChartData<'line'>>({ labels: [], datasets: [] }); // labels를 빈 배열로 초기화
    const [selectedDepartment, setSelectedDepartment] = useState<string>('기획과');
    const [selectedCategory, setSelectedCategory] = useState<string>('대회의');
    const [selectedDate, setSelectedDate] = useState<string>(''); // 날짜 선택
    const [absentees, setAbsentees] = useState<Member[]>([]); // 불참자 리스트

    console.log(absentees, 'absentees');
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
                    if (!team) return;

                    allDates.forEach((date) => {
                        let attendance = 0;

                        if (['말노정', '구역모임'].includes(selectedCategory)) {
                            attendance = entry[date] === '1' ? 1 : 0;
                        } else if (selectedCategory === '구역예배') {
                            attendance = entry[date] === '본구역예배' ? 1 : 0;
                        } else if (['총특교', '지정교'].includes(selectedCategory)) {
                            attendance = entry[date] === '미시청' ? 0 : 1;
                        } else if (['주일예배', '삼일예배'].includes(selectedCategory)) {
                            attendance = [
                                '선교교회',
                                '형제교회',
                                '당일 외 대면',
                                '8시',
                                '정오',
                                '오후 3:30:00',
                                '19시',
                                '20시',
                                '21시',
                            ].includes(entry[date])
                                ? 1
                                : 0;
                        } else {
                            attendance = entry[date] === '참석' ? 1 : 0;
                        }

                        if (!teamAttendanceByDate[date]) teamAttendanceByDate[date] = {};
                        if (!teamAttendanceByDate[date][team]) teamAttendanceByDate[date][team] = [];
                        teamAttendanceByDate[date][team].push(attendance);
                    });
                });

                const teams = Array.from(
                    new Set(Object.values(teamAttendanceByDate).flatMap((teamData) => Object.keys(teamData)))
                ).sort();

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

                setChartData({ labels: allDates, datasets });
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAndCalculateParticipation();
    }, [selectedCategory]);

    // 날짜 선택 시 불참자 목록 필터링
    useEffect(() => {
        if (!selectedDate) return;
        const fetchAbsentees = async () => {
            const res = await fetch(`/api/googleSheet?sheet=${selectedCategory}`);
            const json = await res.json();

            if (!json.ok || !json.data) {
                console.error('Invalid data structure:', json);
                return;
            }

            const categoryData: Member[] = json.data;
            const absenteesList = categoryData
                .filter((entry) => entry[selectedDate]?.startsWith('불참'))
                .map((entry) => {
                    const absenceReason = entry[selectedDate]?.split('(')[1]?.replace(')', '') || '사유 없음'; // 괄호 안의 사유 추출
                    return {
                        이름: entry.이름,
                        구역: entry.구역, // 예시: 구역 정보 추가
                        직책: entry.직책, // 예시: 직책 정보 추가
                        reason: absenceReason,
                    };
                });

            // 이제 setState에 Member[] 타입을 전달
            setAbsentees(absenteesList);
        };

        fetchAbsentees();
    }, [selectedDate, selectedCategory]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">{selectedDepartment} - 팀별 참석률 분석</h1>
            <div className="mb-4">
                {Object.keys(departmentCategories).map((department) => (
                    <button
                        key={department}
                        className={`px-4 py-2 text-white rounded-md mr-2 ${
                            selectedDepartment === department ? 'bg-green-600' : 'bg-green-500 hover:bg-green-600'
                        }`}
                        onClick={() => {
                            setSelectedDepartment(department);
                            setSelectedCategory(departmentCategories[department][0]);
                        }}
                    >
                        {department}
                    </button>
                ))}
            </div>
            <div className="mb-4">
                {departmentCategories[selectedDepartment].map((category) => (
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
            <div className="mb-4">
                <label
                    htmlFor="dateSelect"
                    className="mr-2"
                >
                    날짜 선택:
                </label>
                <select
                    id="dateSelect"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-4 py-2"
                >
                    <option value="">날짜를 선택하세요</option>
                    {chartData.labels && chartData.labels.length > 0 ? (
                        chartData.labels.map((date) => (
                            <option
                                key={date as string}
                                value={date as string}
                            >
                                {date as string}
                            </option>
                        ))
                    ) : (
                        <option disabled>데이터가 없습니다</option>
                    )}
                </select>
            </div>
            {selectedDate && (
                <div className="mb-4">
                    <h2 className="text-lg font-semibold">불참자 목록 ({selectedDate}):</h2>
                    <ul>
                        {absentees.map((member) => (
                            <li key={member.이름}>
                                {member.이름} ({member.reason})
                            </li>
                        ))}
                    </ul>
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
                                text: `${selectedDepartment} - ${selectedCategory} 팀별 참석률`,
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

export default Functions;
