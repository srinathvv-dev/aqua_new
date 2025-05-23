import VehicleCards from './VehicleCards';

export const metadata = {
  title: 'AQUA | Vehicle Status',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="py-12 text-center">
        <h1 className="text-4xl font-light text-gray-800">AQUA</h1>
        <p className="text-gray-500 mt-2">Underwater Robotics Control System</p>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center px-4 pb-12">
        <VehicleCards />
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-500 text-sm border-t border-gray-200">
        AQUA Systems © {new Date().getFullYear()}
      </footer>
    </div>
  );
}