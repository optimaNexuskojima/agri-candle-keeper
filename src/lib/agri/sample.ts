import type { AgriDatabase, DemandLevel, Note, PriceEntry, SupplyLevel } from "./types";

function seededSequence(seed: number, count: number): number[] {
  const out: number[] = [];
  let state = seed;
  for (let i = 0; i < count; i += 1) {
    state = (state * 1103515245 + 12345) % 2147483648;
    out.push(state / 2147483648);
  }
  return out;
}

function dateNDaysAgo(n: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - n);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const SUPPLY_CYCLE: SupplyLevel[] = ["normal", "normal", "low", "high", "normal", "low"];
const DEMAND_CYCLE: DemandLevel[] = ["normal", "high", "high", "normal", "low", "high"];

interface SampleGoodSpec {
  id: string;
  name: string;
  category: string;
  unit: string;
  grade: string;
  marketLocation: string;
  currency: string;
  basePrice: number;
  seed: number;
  season: {
    plantingMonths: number[];
    growingMonths: number[];
    harvestMonths: number[];
    peakSupplyMonths: number[];
    leanMonths: number[];
    notes: string;
  };
}

const SPECS: SampleGoodSpec[] = [
  {
    id: "sample-sesame",
    name: "Sesame",
    category: "Oilseed",
    unit: "bag",
    grade: "Black, FAQ",
    marketLocation: "Mandalay",
    currency: "MMK",
    basePrice: 210000,
    seed: 101,
    season: {
      plantingMonths: [5, 6],
      growingMonths: [7, 8],
      harvestMonths: [9, 10],
      peakSupplyMonths: [10, 11],
      leanMonths: [4, 5, 6],
      notes: "Monsoon sesame crop; export demand peaks after harvest.",
    },
  },
  {
    id: "sample-black-gram",
    name: "Black Gram",
    category: "Pulses",
    unit: "bag",
    grade: "SQ",
    marketLocation: "Yangon",
    currency: "MMK",
    basePrice: 148000,
    seed: 202,
    season: {
      plantingMonths: [11, 12],
      growingMonths: [1, 2],
      harvestMonths: [3, 4],
      peakSupplyMonths: [4, 5],
      leanMonths: [9, 10],
      notes: "Strong India export demand during harvest window.",
    },
  },
  {
    id: "sample-mung-bean",
    name: "Mung Bean",
    category: "Pulses",
    unit: "bag",
    grade: "Green, FAQ",
    marketLocation: "Bago",
    currency: "MMK",
    basePrice: 132000,
    seed: 303,
    season: {
      plantingMonths: [10, 11],
      growingMonths: [12, 1],
      harvestMonths: [2, 3],
      peakSupplyMonths: [3, 4],
      leanMonths: [8, 9],
      notes: "Local demand steady; storage loss risk in wet months.",
    },
  },
];

const SAMPLE_NOTES: Array<{
  goodId: string;
  dayAgo: number;
  direction: Note["direction"];
  reasonTag: string;
  impact: Note["impact"];
  text: string;
}> = [
  {
    goodId: "sample-sesame",
    dayAgo: 1,
    direction: "up",
    reasonTag: "export_demand",
    impact: "high",
    text: "Exporters buying aggressively for container shipments this week.",
  },
  {
    goodId: "sample-sesame",
    dayAgo: 8,
    direction: "down",
    reasonTag: "harvest_arrival",
    impact: "medium",
    text: "New arrivals from upcountry pushed prices lower.",
  },
  {
    goodId: "sample-sesame",
    dayAgo: 20,
    direction: "neutral",
    reasonTag: "buyers_waiting",
    impact: "low",
    text: "Buyers waiting for clarity on freight rates.",
  },
  {
    goodId: "sample-black-gram",
    dayAgo: 2,
    direction: "up",
    reasonTag: "low_supply",
    impact: "high",
    text: "Sellers holding stock, very few offers in the market.",
  },
  {
    goodId: "sample-black-gram",
    dayAgo: 12,
    direction: "down",
    reasonTag: "currency_change",
    impact: "medium",
    text: "Currency moved, importers reduced bids.",
  },
  {
    goodId: "sample-mung-bean",
    dayAgo: 3,
    direction: "up",
    reasonTag: "festival_demand",
    impact: "medium",
    text: "Festival demand from local millers lifted prices.",
  },
  {
    goodId: "sample-mung-bean",
    dayAgo: 15,
    direction: "down",
    reasonTag: "transport_cost",
    impact: "low",
    text: "Cheaper trucking rates eased delivered cost.",
  },
];

export function buildSampleData(): AgriDatabase {
  const now = new Date().toISOString();
  const goods = SPECS.map((spec) => ({
    id: spec.id,
    name: spec.name,
    category: spec.category,
    unit: spec.unit,
    grade: spec.grade,
    marketLocation: spec.marketLocation,
    currency: spec.currency,
    archived: false,
    createdAt: now,
  }));

  const prices: PriceEntry[] = [];
  SPECS.forEach((spec) => {
    const noise = seededSequence(spec.seed, 30);
    let close = spec.basePrice;
    for (let i = 29; i >= 0; i -= 1) {
      const step = (noise[29 - i]! - 0.45) * spec.basePrice * 0.02;
      const previousClose = close;
      close = Math.round((previousClose + step) / 50) * 50;
      const date = dateNDaysAgo(i);
      const withCandle = (29 - i) % 3 !== 2; // most entries have OHLC, some close only
      const high = Math.round(Math.max(previousClose, close) * 1.008);
      const low = Math.round(Math.min(previousClose, close) * 0.992);
      prices.push({
        id: `${spec.id}-price-${date}`,
        goodId: spec.id,
        date,
        close,
        ...(withCandle ? { open: previousClose, high, low } : {}),
        supply: SUPPLY_CYCLE[(29 - i) % SUPPLY_CYCLE.length]!,
        demand: DEMAND_CYCLE[(29 - i) % DEMAND_CYCLE.length]!,
        stockLevel: (29 - i) % 4 === 0 ? "low" : "normal",
        volumeEstimate: 100 + Math.round(noise[29 - i]! * 400),
        source: "Market survey",
        createdAt: now,
        updatedAt: now,
      });
    }
  });

  const notes: Note[] = SAMPLE_NOTES.map((note, index) => {
    const date = dateNDaysAgo(note.dayAgo);
    const price = prices.find((p) => p.goodId === note.goodId && p.date === date);
    return {
      id: `sample-note-${index + 1}`,
      goodId: note.goodId,
      date,
      ...(price ? { priceId: price.id } : {}),
      direction: note.direction,
      reasonTag: note.reasonTag,
      text: note.text,
      impact: note.impact,
      createdAt: now,
    };
  });

  const seasons = SPECS.map((spec) => ({ goodId: spec.id, ...spec.season }));

  return { goods, prices, notes, seasons };
}
