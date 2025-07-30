import { describe, test, expect } from "vitest";
import {
  parseChaptersFromDescription,
  findChapterByTime,
} from "../app/src/background_description.js";

describe("parseChaptersFromDescription", () => {
  test("should parse basic MM:SS format chapters", () => {
    const description = `0:00 Introduction
1:30 Getting Started
5:45 Advanced Topics`;

    const result = parseChaptersFromDescription(description);

    expect(result).toEqual([
      { startTime: 0, title: "Introduction" },
      { startTime: 90, title: "Getting Started" },
      { startTime: 345, title: "Advanced Topics" },
    ]);
  });

  test("should parse HH:MM:SS format chapters", () => {
    const description = `0:00:00 Introduction
0:01:30 Getting Started
1:05:45 Advanced Topics
1:30:00 Conclusion`;

    const result = parseChaptersFromDescription(description);

    expect(result).toEqual([
      { startTime: 0, title: "Introduction" },
      { startTime: 90, title: "Getting Started" },
      { startTime: 3945, title: "Advanced Topics" },
      { startTime: 5400, title: "Conclusion" },
    ]);
  });

  test("should handle chapters with decorative characters", () => {
    const description = `• 0:00 Introduction
- 1:30 Getting Started
→ 5:45 Advanced Topics
‣ 10:00 Conclusion`;

    const result = parseChaptersFromDescription(description);

    expect(result).toEqual([
      { startTime: 0, title: "Introduction" },
      { startTime: 90, title: "Getting Started" },
      { startTime: 345, title: "Advanced Topics" },
      { startTime: 600, title: "Conclusion" },
    ]);
  });

  test("should handle chapters with separators after timestamp", () => {
    const description = `0:00 - Introduction
1:30 → Getting Started
5:45 : Advanced Topics
10:00 • Conclusion`;

    const result = parseChaptersFromDescription(description);

    expect(result).toEqual([
      { startTime: 0, title: "Introduction" },
      { startTime: 90, title: "Getting Started" },
      { startTime: 345, title: "Advanced Topics" },
      { startTime: 600, title: "Conclusion" },
    ]);
  });

  test("should handle mixed MM:SS and HH:MM:SS formats", () => {
    const description = `0:00 Introduction
1:30 Getting Started
1:05:45 Advanced Topics
75:30 Final Section`;

    const result = parseChaptersFromDescription(description);

    expect(result).toEqual([
      { startTime: 0, title: "Introduction" },
      { startTime: 90, title: "Getting Started" },
      { startTime: 3945, title: "Advanced Topics" },
      { startTime: 4530, title: "Final Section" },
    ]);
  });

  test("should skip lines without timestamps", () => {
    const description = `This is a description
0:00 Introduction
Some other text here
1:30 Getting Started
Random content without timestamp
5:45 Advanced Topics`;

    const result = parseChaptersFromDescription(description);

    expect(result).toEqual([
      { startTime: 0, title: "Introduction" },
      { startTime: 90, title: "Getting Started" },
      { startTime: 345, title: "Advanced Topics" },
    ]);
  });

  test("should skip chapters with invalid timestamps (minutes >= 60)", () => {
    const description = `0:00 Introduction
1:75 Invalid Chapter (should be skipped)
2:30 Valid Chapter`;

    const result = parseChaptersFromDescription(description);

    expect(result).toEqual([
      { startTime: 0, title: "Introduction" },
      { startTime: 150, title: "Valid Chapter" },
    ]);
  });

  test("should skip chapters with invalid timestamps (seconds >= 60)", () => {
    const description = `0:00 Introduction
1:30 Valid Chapter
2:75 Invalid Chapter (should be skipped)`;

    const result = parseChaptersFromDescription(description);

    expect(result).toEqual([
      { startTime: 0, title: "Introduction" },
      { startTime: 90, title: "Valid Chapter" },
    ]);
  });

  test("should skip chapters with titles too short (< 2 characters)", () => {
    const description = `0:00 Introduction
1:30 A
2:30 Valid Chapter
3:00 B`;

    const result = parseChaptersFromDescription(description);

    expect(result).toEqual([
      { startTime: 0, title: "Introduction" },
      { startTime: 150, title: "Valid Chapter" },
    ]);
  });

  test("should handle chapters with extra whitespace", () => {
    const description = `   0:00   Introduction   
    1:30    Getting Started    
  5:45  Advanced Topics  `;

    const result = parseChaptersFromDescription(description);

    expect(result).toEqual([
      { startTime: 0, title: "Introduction" },
      { startTime: 90, title: "Getting Started" },
      { startTime: 345, title: "Advanced Topics" },
    ]);
  });

  test("should handle empty description", () => {
    const result = parseChaptersFromDescription("");
    expect(result).toEqual([]);
  });

  test("should handle description with only whitespace", () => {
    const result = parseChaptersFromDescription("   \n  \n  ");
    expect(result).toEqual([]);
  });

  test("should handle description with no valid chapters", () => {
    const description = `This is just a regular description
with multiple lines
but no timestamps
or chapter information`;

    const result = parseChaptersFromDescription(description);
    expect(result).toEqual([]);
  });

  test("should handle complex real-world example", () => {
    const description = `In this video we'll cover:

• 0:00 Introduction & Overview
– 2:15 Setting up the environment
▪ 5:30 Basic concepts explained
‣ 8:45 Hands-on demo
- 12:30 Advanced techniques
- 15:00 Common pitfalls to avoid
• 18:15 Q&A Session
  20:00 Conclusion

Thanks for watching!`;

    const result = parseChaptersFromDescription(description);

    expect(result).toEqual([
      { startTime: 0, title: "Introduction & Overview" },
      { startTime: 135, title: "Setting up the environment" },
      { startTime: 330, title: "Basic concepts explained" },
      { startTime: 525, title: "Hands-on demo" },
      { startTime: 750, title: "Advanced techniques" },
      { startTime: 900, title: "Common pitfalls to avoid" },
      { startTime: 1095, title: "Q&A Session" },
      { startTime: 1200, title: "Conclusion" },
    ]);
  });

  test("should handle large minute values in MM:SS format", () => {
    const description = `0:00 Introduction
59:59 Almost an hour
120:30 Two hours in`;

    const result = parseChaptersFromDescription(description);

    expect(result).toEqual([
      { startTime: 0, title: "Introduction" },
      { startTime: 3599, title: "Almost an hour" },
      { startTime: 7230, title: "Two hours in" },
    ]);
  });

  test("should handle edge case with single digit hours", () => {
    const description = `0:00:00 Start
1:00:00 One hour mark
9:30:45 Nine and a half hours`;

    const result = parseChaptersFromDescription(description);

    expect(result).toEqual([
      { startTime: 0, title: "Start" },
      { startTime: 3600, title: "One hour mark" },
      { startTime: 34245, title: "Nine and a half hours" },
    ]);
  });

  test("should handle unicode characters", () => {
    const description = `0:00 Sławomir Mentzen - Introduction
1:30 Sławomir Mentzen - Getting Started
5:45 Sławomir Mentzen - Advanced Topics`;

    const result = parseChaptersFromDescription(description);

    expect(result).toEqual([
      { startTime: 0, title: "Sławomir Mentzen - Introduction" },
      { startTime: 90, title: "Sławomir Mentzen - Getting Started" },
      { startTime: 345, title: "Sławomir Mentzen - Advanced Topics" },
    ]);
  });

  test("should handle 'title: timestamp' format https://www.youtube.com/watch?v=ghuLDyUEZmY", () => {
    const description = `Intro: 0:00
Artillery trains: 0:21
Right enough debugging stuff: 0:51
Landfill: 1:17
Eworiment or something: 1:56
Nuclear chain reaction: 2:26`;

    const result = parseChaptersFromDescription(description);

    expect(result).toEqual([
      { startTime: 0, title: "Intro" },
      { startTime: 21, title: "Artillery trains" },
      { startTime: 51, title: "Right enough debugging stuff" },
      { startTime: 77, title: "Landfill" },
      { startTime: 116, title: "Eworiment or something" },
      { startTime: 146, title: "Nuclear chain reaction" },
    ]);
  });

  test("should parse kids creative cardboard example https://www.youtube.com/watch?v=UAmqrySBUYo", () => {
    const description = `Kids learn to be kind and share with friends - Creative Cardboard School Adventure!

00:00 Creative Cardboard School Adventure
04:23 Kids turn into superheroes with inflatable toys
09:20 Funny kids stories with Magic Fish
14:13 Escalator Mall Adventure - Kids Learn Mall Safety Rules

Please Subscribe!`;

    const result = parseChaptersFromDescription(description);

    expect(result).toEqual([
      {
        startTime: 0,
        title: "Creative Cardboard School Adventure",
      },
      {
        startTime: 263,
        title: "Kids turn into superheroes with inflatable toys",
      },
      {
        startTime: 560,
        title: "Funny kids stories with Magic Fish",
      },
      {
        startTime: 853,
        title: "Escalator Mall Adventure - Kids Learn Mall Safety Rules",
      },
    ]);
  });
});

describe("findChapterByTime", () => {
  const chapters = [
    { startTime: 0, title: "Introduction" },
    { startTime: 90, title: "Getting Started" },
    { startTime: 345, title: "Advanced Topics" },
    { startTime: 600, title: "Conclusion" },
  ];

  test("should find correct chapter for exact start time", () => {
    const result = findChapterByTime(90, chapters);
    expect(result).toEqual({ startTime: 90, title: "Getting Started" });
  });

  test("should find correct chapter for time within chapter range", () => {
    const result = findChapterByTime(200, chapters);
    expect(result).toEqual({ startTime: 90, title: "Getting Started" });
  });

  test("should find first chapter for time before first chapter", () => {
    const result = findChapterByTime(0, chapters);
    expect(result).toEqual({ startTime: 0, title: "Introduction" });
  });

  test("should find last chapter for time after last chapter", () => {
    const result = findChapterByTime(1000, chapters);
    expect(result).toEqual({ startTime: 600, title: "Conclusion" });
  });

  test("should return null for empty chapters array", () => {
    const result = findChapterByTime(100, []);
    expect(result).toBeNull();
  });

  test("should handle single chapter", () => {
    const singleChapter = [{ startTime: 0, title: "Only Chapter" }];
    const result = findChapterByTime(500, singleChapter);
    expect(result).toEqual({ startTime: 0, title: "Only Chapter" });
  });
});
