import React from 'react';
import SensorDashboard from '../components/testDashboard';
import '../assets/css/Home.css'

function Home() {
    return (
        <div className='main'>
            <main className='dashBoard'>
                <SensorDashboard />
            </main>
        </div>
    );
}

export default Home;