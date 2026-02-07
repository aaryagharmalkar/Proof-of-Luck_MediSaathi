export default function OnboardingProgress({ currentStep, totalSteps }) {
  return (
    <div className="w-full max-w-xl mx-auto px-4 mb-8">
      <div className="flex gap-2">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`h-2 flex-1 rounded-full transition-colors duration-300
              ${index < currentStep ? "bg-teal-500" : "bg-gray-200"}
            `}
          />
        ))}
      </div>
    </div>
  );
}
