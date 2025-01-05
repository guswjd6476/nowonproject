import Link from 'next/link';
import { useEffect, useState } from 'react';

const ListPage = () => {
    const [people, setPeople] = useState<string[]>([]);

    useEffect(() => {
        async function fetchPeople() {
            const res = await fetch('/api/googleSheet');
            const data = await res.json();
            if (data.ok) {
                const peopleList = data.data['노원명단'].map((person: any) => person['이름']);
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
