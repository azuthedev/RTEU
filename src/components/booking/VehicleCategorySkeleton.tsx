import React from 'react';

const VehicleCategorySkeleton = () => {
  return (
    <>
      {/* Category Navigation Skeleton */}
      <div className="flex items-center justify-center md:justify-start space-x-2 overflow-x-auto py-2 px-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 w-24 rounded-full bg-gray-200 animate-pulse" />
        ))}
      </div>
      
      {/* Vehicle Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
            <div className="aspect-[16/9] bg-gray-200 mb-4 rounded" />
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-4 w-4 bg-gray-200 rounded-full mr-1" />
                ))}
              </div>
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="h-5 bg-gray-200 rounded" />
              <div className="h-5 bg-gray-200 rounded" />
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="h-8 w-20 bg-gray-200 rounded" />
              <div className="h-10 w-24 bg-gray-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default VehicleCategorySkeleton;