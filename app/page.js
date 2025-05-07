import Link from 'next/link';
import { FiBattery } from 'react-icons/fi';

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
      status: 'active'
    },
    {
      id: 'auv',
      name: 'Actual AUV',
      type: 'Primary AUV',
      battery: 78,
      status: 'in planning'
    },
    {
      id: 'rov',
      name: 'ROV',
      type: 'Work ROV',
      battery: 42,
      status: 'disarmed'
    },
    {
      id: 'docking',
      name: 'Docking Station',
      type: 'Docking Station',
      battery: 100,
      status: 'in progress'
    }
  ];

  const getStatusStyles = (status) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'disarmed':
        return 'bg-gray-100 text-gray-800';
      case 'in planning':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getBatteryColor = (level) => {
    if (level < 30) return 'text-red-500';
    if (level < 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="py-12 text-center">
        <h1 className="text-4xl font-light text-gray-800">AQUA</h1>
        <p className="text-gray-500 mt-2">Underwater Robotics Control System</p>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full">
          {vehicles.map((vehicle) => (
            <Link 
              key={vehicle.id}
              href={`/${vehicle.id}`}
              className="group relative bg-white rounded-xl p-6 text-center border-2 border-gray-100 hover:border-blue-300 transition-all duration-200 hover:shadow-sm"
            >
              {/* Vehicle Name */}
              <h2 className="text-2xl font-medium text-gray-800 mb-1">{vehicle.name}</h2>
              
              {/* Vehicle Type */}
              <p className="text-gray-500 text-sm mb-6">{vehicle.type}</p>
              
              {/* Status Indicator */}
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-6 ${getStatusStyles(vehicle.status)}`}>
                {vehicle.status.toUpperCase()}
              </div>
              
              {/* Battery Indicator */}
              <div className="flex flex-col items-center justify-center space-y-1">
                <div className="flex items-center">
                  <FiBattery className={`mr-2 ${getBatteryColor(vehicle.battery)} text-lg`} />
                  <span className="font-medium text-gray-700">{vehicle.battery}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${getBatteryColor(vehicle.battery).replace('text', 'bg')}`}
                    style={{ width: `${vehicle.battery}%` }}
                  ></div>
                </div>
              </div>

              {/* Subtle hover accent */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-500 text-sm border-t border-gray-200">
        AQUA Systems © {new Date().getFullYear()}
      </footer>
    </div>
  );
}