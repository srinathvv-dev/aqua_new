import Link from 'next/link';
import { FiBattery, FiWifi } from 'react-icons/fi';

export const metadata = {
  title: 'AQUA | Vehicle Status',
};

export default function Home() {
  const vehicles = [
    {
      id: 'mauv',
      name: 'M-AUV',
      type: 'Modular AUV',
      battery: 94,
      signal: 'strong',
      status: 'active'
    },
    {
      id: 'auv',
      name: 'Actual AUV',
      type: 'Primary AUV',
      battery: 78,
      signal: 'medium',
      status: 'active'
    },
    {
      id: 'rov',
      name: 'ROV',
      type: 'Work ROV',
      battery: 42,
      signal: 'weak',
      status: 'degraded'
    },
    {
      id: 'docking',
      name: 'Docking Station',
      type: 'Docking Station',
      battery: 100,
      signal: 'excellent',
      status: 'standby'
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="py-8 text-center">
        <h1 className="text-4xl font-light text-gray-900">AQUA</h1>
        <p className="text-gray-500 mt-2">Underwater Robotics Control</p>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl w-full">
          {vehicles.map((vehicle) => (
            <Link 
              key={vehicle.id}
              href={`/${vehicle.id}`}
              className="group border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors text-center"
            >
              {/* Vehicle Name */}
              <h2 className="text-2xl font-normal text-gray-900 mb-1">{vehicle.name}</h2>
              
              {/* Vehicle Type */}
              <p className="text-gray-500 text-sm mb-6">{vehicle.type}</p>
              
              {/* Status Indicator */}
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-6 ${
                vehicle.status === 'active' ? 'bg-green-100 text-green-800' :
                vehicle.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {vehicle.status.toUpperCase()}
              </div>
              
              {/* Metrics */}
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <FiBattery className={`mr-2 ${
                    vehicle.battery < 30 ? 'text-red-500' : 
                    vehicle.battery < 60 ? 'text-yellow-500' : 'text-green-500'
                  }`} />
                  <span className="font-medium">{vehicle.battery}%</span>
                </div>
                
                <div className="flex items-center justify-center">
                  <FiWifi className={`mr-2 ${
                    vehicle.signal === 'weak' ? 'text-red-500' : 
                    vehicle.signal === 'medium' ? 'text-yellow-500' : 'text-green-500'
                  }`} />
                  <span className="capitalize">{vehicle.signal}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-400 text-sm">
        AQUA Systems © {new Date().getFullYear()}
      </footer>
    </div>
  );
}