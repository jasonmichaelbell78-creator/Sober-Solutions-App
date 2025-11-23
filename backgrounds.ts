// Recovery and motivational themed backgrounds
// Each background represents a theme in recovery journey

export interface Background {
  name: string;
  theme: string;
  gradient: string;
}

export const backgrounds: Background[] = [
  {
    name: "New Dawn",
    theme: "Hope & New Beginnings",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  },
  {
    name: "Peaceful Path",
    theme: "Serenity & Peace",
    gradient: "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)"
  },
  {
    name: "Strength Within",
    theme: "Inner Strength",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
  },
  {
    name: "Growth & Renewal",
    theme: "Personal Growth",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
  },
  {
    name: "Mountain Summit",
    theme: "Achievement & Progress",
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
  },
  {
    name: "Healing Light",
    theme: "Healing & Recovery",
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
  },
  {
    name: "Clear Horizon",
    theme: "Clarity & Focus",
    gradient: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)"
  },
  {
    name: "Courage",
    theme: "Bravery & Determination",
    gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)"
  },
  {
    name: "One Day at a Time",
    theme: "Mindfulness & Presence",
    gradient: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)"
  },
  {
    name: "Resilience",
    theme: "Bouncing Back",
    gradient: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"
  }
];

/**
 * Get a background based on rotation
 * Changes background on each login for variety and inspiration
 */
export const getRotatingBackground = (): Background => {
  const today = new Date();
  // Rotate daily based on day of year
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  const index = dayOfYear % backgrounds.length;
  return backgrounds[index];
};

/**
 * Get a random background for variety
 */
export const getRandomBackground = (): Background => {
  const index = Math.floor(Math.random() * backgrounds.length);
  return backgrounds[index];
};
