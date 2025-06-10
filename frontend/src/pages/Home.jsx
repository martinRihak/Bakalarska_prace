import React from 'react';
import SensorDashboard from '@components/Dashboard';
import UserBar from '@components/UserBar';
import '@css/Home.css'

function Home() {
    return (
        <div className='main'>
            <UserBar />
            <main className='dashBoard'>
                <SensorDashboard />
            </main>
        </div>
    );
}

export default Home;