import Link from 'next/link';
import { useEffect, useState } from 'react';

// '노원명단' 시트에서 가져오는 데이터 구조 타입을 정의합니다.
interface Person {
    이름: string;
}

const ListPage = () => {
    const [people, setPeople] = useState<string[]>([]);

    useEffect(() => {
        async function fetchPeople() {
            const res = await fetch('/api/googleSheet');
            const data = await res.json();
            if (data.ok) {
                // 'data.data['노원명단']'의 요소는 Person 타입이라고 가정
                const peopleList = data.data['노원명단'].map((person: Person) => person['이름']);
                setPeople(peopleList);
            }
        }

        fetchPeople();
    }, []);

    return (
        <div>
            <h1>사람 목록</h1>
            <ul>
                {people.map((person) => (
                    <li key={person}>
                        <Link href={`/person/${person}`}>
                            <a>{person}</a>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ListPage;
