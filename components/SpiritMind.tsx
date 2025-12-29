import React, { useEffect, useState } from 'react';
import { Quote } from 'lucide-react';

const quotes = [
    { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
    { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
    { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
    { text: "Discipline is freedom.", author: "Jocko Willink" }
];

const affirmations = [
    "I am the architect of my reality.",
    "Focus is the currency of the 21st century.",
    "I choose clarity over comfort.",
    "My mind is a fortress against distraction."
];

const SpiritMind: React.FC = () => {
    const [quote, setQuote] = useState(quotes[0]);

    useEffect(() => {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        setQuote(randomQuote);
    }, []);

    return (
        <div className="h-full p-8 flex flex-col items-center justify-center text-center space-y-12 animate-fade-in">
            <div className="max-w-2xl relative">
                <Quote size={48} className="text-nexus-border absolute -top-12 -left-12 opacity-50" />
                <h2 className="text-4xl md:text-5xl font-light text-nexus-text leading-tight tracking-tight">
                    "{quote.text}"
                </h2>
                <p className="mt-6 text-nexus-muted font-mono uppercase tracking-widest text-sm">— {quote.author}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl mt-12">
                {affirmations.map((text, idx) => (
                    <div key={idx} className="bg-nexus-surface/30 border border-nexus-border p-6 rounded hover:bg-nexus-surface/60 transition-colors cursor-default group">
                        <p className="text-nexus-text/80 font-light group-hover:text-white transition-colors">{text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SpiritMind;