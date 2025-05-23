'use client';

import Link from 'next/link';
import { FiBattery } from 'react-icons/fi';
import { useEffect, useState, useRef } from 'react';

export default function VehicleCards() {
  const [vehicles, setVehicles] = useState([
    {
      id: 'mauv',
      name: 'M-AUV',
      type: 'Modular AUV',
      battery1: null, // Battery 1 voltage
      battery2: null, // Battery 2 voltage
      status: 'active'
    },
    {
      id: 'auv',
      name: 'Actual AUV',
      type: 'Primary AUV',
      battery: null,
      status: 'in planning'
    },
    {
      id: 'rov',
      name: 'ROV',
      type: 'Work ROV',
      battery: null,
      status: 'disarmed'
    },
    {
      id: 'docking',
      name: 'Docking Station',
      type: 'Docking Station',
      battery: 100,
      status: 'in progress'
    }
  ]);

  const wsRef = useRef(null);

  useEffect(() => {
    const connectWebSocket = () => {
      wsRef.current = new WebSocket('ws://localhost:3001');

      wsRef.current.onopen = () => {
        console.log('Connected to WebSocket server');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.topic === '/battery_voltage') {
            setVehicles(prev => {
              return prev.map(vehicle => {
                if (vehicle.id === 'mauv') {
                  return {
                    ...vehicle,
                    battery1: message.data.battery1,
                    battery2: message.data.battery2
                  };
                }
                
                // For other vehicles, keep existing battery logic
                let batteryValue = vehicle.battery;
                if (vehicle.id === 'auv') {
                  batteryValue = calculateBatteryPercentage(message.data.battery2);
                } else if (vehicle.id === 'rov') {
                  const rovPercentage = calculateBatteryPercentage(message.data.battery1);
                  batteryValue = rovPercentage !== null ? Math.max(0, rovPercentage - 20) : null;
                }
                
                return {
                  ...vehicle,
                  battery: batteryValue
                };
              });
            });
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const calculateBatteryPercentage = (voltage) => {
    if (voltage === null || voltage === undefined) return null;
    const minVoltage = 12.0;
    const maxVoltage = 18.0;
    const clampedVoltage = Math.min(Math.max(voltage, minVoltage), maxVoltage);
    return Math.round(((clampedVoltage - minVoltage) / (maxVoltage - minVoltage)) * 100);
  };

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

  const getBatteryColor = (voltage) => {
    if (voltage === null || voltage === undefined) return 'text-gray-500';
    if (voltage < 12.5) return 'text-red-500';
    if (voltage < 14.5) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full">
      {vehicles.map((vehicle) => (
        <Link 
          key={vehicle.id}
          href={`/${vehicle.id}`}
          className="group relative bg-white rounded-xl p-6 text-center border-2 border-gray-100 hover:border-blue-300 transition-all duration-200 hover:shadow-sm"
        >
          <h2 className="text-2xl font-medium text-gray-800 mb-1">{vehicle.name}</h2>
          <p className="text-gray-500 text-sm mb-6">{vehicle.type}</p>
          
          <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-6 ${getStatusStyles(vehicle.status)}`}>
            {vehicle.status.toUpperCase()}
          </div>
          
          {/* Special battery display for MAUV */}
          {vehicle.id === 'mauv' ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <div className="flex items-center">
                  <FiBattery className={`mr-2 ${getBatteryColor(vehicle.battery1)} text-lg`} />
                  <span className="font-medium text-gray-700">
                    {vehicle.battery1 !== null ? `${vehicle.battery1.toFixed(2)}V` : 'N/A'}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">(Battery 1)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${getBatteryColor(vehicle.battery1).replace('text', 'bg')}`}
                    style={{ width: `${vehicle.battery1 !== null ? ((vehicle.battery1 - 12) / 6 * 100) : 0}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="flex items-center">
                  <FiBattery className={`mr-2 ${getBatteryColor(vehicle.battery2)} text-lg`} />
                  <span className="font-medium text-gray-700">
                    {vehicle.battery2 !== null ? `${vehicle.battery2.toFixed(2)}V` : 'N/A'}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">(Battery 2)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${getBatteryColor(vehicle.battery2).replace('text', 'bg')}`}
                    style={{ width: `${vehicle.battery2 !== null ? ((vehicle.battery2 - 12) / 6 * 100) : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            /* Normal battery display for other vehicles */
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="flex items-center">
                <FiBattery className={`mr-2 ${getBatteryColor(vehicle.battery)} text-lg`} />
                <span className="font-medium text-gray-700">
                  {vehicle.battery !== null ? `${vehicle.battery}%` : 'N/A'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full ${getBatteryColor(vehicle.battery).replace('text', 'bg')}`}
                  style={{ width: `${vehicle.battery !== null ? vehicle.battery : 0}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </Link>
      ))}
    </div>
  );
}