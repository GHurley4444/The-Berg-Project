"use strict";
/* Content banks for the mini-games. Add your own lines freely. */

const EMOJI = ["🍕", "🎸", "🐙", "🚀", "🌵", "🍩", "🦄", "🎲", "🍉", "👻", "🐝", "🎈", "🐸", "⚽", "🍔", "🦊", "🌈", "🎩", "🐢", "🍓", "🔔", "🧀", "🦋", "🎁"];

const ODD_PAIRS = [["🍎", "🍅"], ["🐶", "🐺"], ["😀", "😃"], ["🚗", "🚙"], ["🍩", "🍪"], ["⭐", "🌟"], ["🐱", "🐯"], ["🍋", "🍌"], ["🐸", "🐢"], ["🌸", "🌺"], ["☕", "🍵"], ["🐻", "🐼"], ["🙂", "🙃"], ["🌕", "🌝"], ["🐭", "🐹"]];

const COLORS = [["RED", "#E5262B"], ["BLUE", "#2357E8"], ["GREEN", "#17A355"], ["YELLOW", "#DDA000"], ["PURPLE", "#8A3FD1"], ["PINK", "#EE4C98"]];

const NUM_QUESTIONS = [
  { q: "How many bones are in the adult human body?", a: 206 },
  { q: "How many keys are on a standard piano?", a: 88 },
  { q: "What year did the Titanic sink?", a: 1912 },
  { q: "How many minutes are in a day?", a: 1440 },
  { q: "How many countries are in the European Union?", a: 27 },
  { q: "How tall is the Eiffel Tower, in meters?", a: 330 },
  { q: "What year did people first walk on the Moon?", a: 1969 },
  { q: "How many teeth does an adult usually have?", a: 32 },
  { q: "At what °F does water boil at sea level?", a: 212 },
  { q: "How many squares are on a chessboard?", a: 64 },
  { q: "What year did the first iPhone come out?", a: 2007 },
  { q: "How many hearts does an octopus have?", a: 3 },
  { q: "How many time zones does Russia span?", a: 11 },
  { q: "How many dots are on a six-sided die in total?", a: 21 },
  { q: "How long is a marathon, in miles (rounded)?", a: 26 },
  { q: "What year did World War II end?", a: 1945 },
  { q: "How many hours are in a week?", a: 168 },
  { q: "How tall is Mount Everest, in meters?", a: 8849 },
  { q: "How many bones does a shark have?", a: 0 },
  { q: "What year was Google founded?", a: 1998 },
  { q: "How many feet are in a mile?", a: 5280 },
  { q: "How many stripes are on the US flag?", a: 13 },
  { q: "What year did the Berlin Wall fall?", a: 1989 },
  { q: "How many minutes long is an NBA game (regulation)?", a: 48 },
  { q: "How many moons does Mars have?", a: 2 },
  { q: "How many seconds are in an hour?", a: 3600 },
  { q: "How many cards are in a deck, without jokers?", a: 52 },
  { q: "How many players are on a soccer field, both teams?", a: 22 },
  { q: "How many US states are there?", a: 50 },
  { q: "How fast does sound travel, in meters per second?", a: 343 },
  { q: "What year did Pac-Man first come out?", a: 1980 },
  { q: "How many days does it take Mars to orbit the Sun (rounded)?", a: 687 },
  { q: "How many legs does a lobster have?", a: 10 },
  { q: "How many grams are in a pound (rounded)?", a: 454 }
];

// First option is the right one; options are shuffled when shown.
const TRIVIA = [
  ["Largest planet in our solar system?", "Jupiter", "Saturn", "Neptune", "Earth"],
  ["Chemical symbol for gold?", "Au", "Ag", "Gd", "Go"],
  ["Largest ocean?", "Pacific", "Atlantic", "Indian", "Arctic"],
  ["How many continents are there?", "7", "5", "6", "8"],
  ["Fastest land animal?", "Cheetah", "Lion", "Horse", "Greyhound"],
  ["Capital of Australia?", "Canberra", "Sydney", "Melbourne", "Perth"],
  ["Which planet is called the Red Planet?", "Mars", "Venus", "Jupiter", "Mercury"],
  ["Hardest natural material?", "Diamond", "Gold", "Iron", "Quartz"],
  ["Gas that plants take in?", "Carbon dioxide", "Oxygen", "Nitrogen", "Helium"],
  ["How many sides does a hexagon have?", "6", "5", "7", "8"],
  ["Smallest prime number?", "2", "1", "3", "0"],
  ["Tallest animal?", "Giraffe", "Elephant", "Ostrich", "Moose"],
  ["Main language of Brazil?", "Portuguese", "Spanish", "French", "English"],
  ["Water freezes at how many °C?", "0", "32", "-10", "100"],
  ["Who painted the Mona Lisa?", "Leonardo da Vinci", "Michelangelo", "Picasso", "Van Gogh"],
  ["Which sport has touchdowns?", "American football", "Soccer", "Baseball", "Tennis"],
  ["Largest mammal?", "Blue whale", "Elephant", "Giraffe", "Orca"],
  ["What color is an emerald?", "Green", "Red", "Blue", "Purple"],
  ["Which planet has the famous rings?", "Saturn", "Mars", "Venus", "Mercury"],
  ["Main ingredient in guacamole?", "Avocado", "Tomato", "Lime", "Pea"],
  ["Where do kangaroos come from?", "Australia", "New Zealand", "South Africa", "Brazil"],
  ["Square root of 81?", "9", "8", "7", "18"],
  ["What is a baby cat called?", "Kitten", "Cub", "Pup", "Calf"],
  ["Closest star to Earth?", "The Sun", "Proxima Centauri", "Sirius", "Polaris"],
  ["Which organ pumps blood?", "Heart", "Liver", "Lungs", "Kidney"],
  ["Which bird can't fly?", "Penguin", "Eagle", "Sparrow", "Parrot"],
  ["How many legs does an insect have?", "6", "8", "4", "10"],
  ["H₂O is better known as…", "Water", "Salt", "Air", "Sugar"],
  ["Largest hot desert?", "Sahara", "Gobi", "Kalahari", "Mojave"],
  ["City with the Statue of Liberty?", "New York", "Washington DC", "Boston", "Chicago"],
  ["12 × 12 = ?", "144", "124", "142", "132"],
  ["Bruce Wayne is which hero?", "Batman", "Superman", "Spider-Man", "Iron Man"],
  ["Fruit with seeds on the outside?", "Strawberry", "Raspberry", "Kiwi", "Banana"],
  ["How many players on a basketball team on court?", "5", "6", "7", "11"],
  ["Which country gave us sushi?", "Japan", "China", "Korea", "Thailand"],
  ["What do caterpillars turn into?", "Butterflies", "Beetles", "Bees", "Spiders"],
  ["Which metal is liquid at room temperature?", "Mercury", "Iron", "Silver", "Lead"],
  ["Longest bone in the body?", "Femur", "Spine", "Tibia", "Humerus"],
  ["Which is a primary color?", "Blue", "Green", "Orange", "Purple"],
  ["How many hours in two days?", "48", "36", "24", "72"]
];

const EMOJI_MOVIES = [
  ["🦁👑", "The Lion King"], ["🕷️🧑", "Spider-Man"], ["🚢🧊💔", "Titanic"], ["🦖🏝️", "Jurassic Park"],
  ["👻🚫", "Ghostbusters"], ["🧙💍🌋", "Lord of the Rings"], ["🐠🔍", "Finding Nemo"], ["❄️👸⛄", "Frozen"],
  ["🤖🌱🌍", "WALL-E"], ["🏠🎈👴", "Up"], ["🍫🏭🎫", "Charlie and the Chocolate Factory"], ["🦈🏖️", "Jaws"],
  ["👽📞🏠", "E.T."], ["🧸🤠🚀", "Toy Story"], ["🐼🥋", "Kung Fu Panda"], ["🏎️⚡", "Cars"],
  ["🐀👨‍🍳", "Ratatouille"], ["🦇🃏", "The Dark Knight"], ["⏰🚗⚡", "Back to the Future"], ["🧛🏨", "Hotel Transylvania"],
  ["🧞🪔", "Aladdin"], ["🐻🍯", "Winnie the Pooh"], ["🌊👧🐔", "Moana"], ["🐉🥚🧒", "How to Train Your Dragon"],
  ["🧜‍♀️🦀", "The Little Mermaid"], ["🟢👹🧅", "Shrek"], ["🧠😀😢😡", "Inside Out"], ["🦸🦸‍♀️👶", "The Incredibles"],
  ["🧹⚡👓", "Harry Potter"], ["🌌⚔️👨‍👦", "Star Wars"], ["💀🎸🌼", "Coco"]
];

const SCRAMBLE = ["PARTY", "PIZZA", "DANCE", "GUITAR", "PLANET", "ROCKET", "BANANA", "CASTLE", "DRAGON", "JUNGLE", "PENCIL", "WINTER", "SUMMER", "COFFEE", "TIGER", "CANDLE", "BOTTLE", "GARDEN", "MONKEY", "PILLOW", "ORANGE", "SILVER", "MARKET", "BUTTER", "TURTLE", "PIRATE", "WIZARD", "CIRCUS", "PICNIC", "SPIDER", "PUZZLE", "MAGNET"];

const CATEGORIES = ["Pizza toppings", "Zoo animals", "Car brands", "Things in a kitchen", "Fruits", "Countries in Europe", "Sports", "Things that are red", "Breakfast foods", "Superheroes", "Board games", "Things at the beach", "Ice cream flavors", "Musical instruments", "Dog breeds", "Jobs", "Things in a school", "Vegetables", "US cities", "Things that fly", "Clothing", "Body parts", "Animated movies", "Drinks", "Fast food chains", "Things in a bathroom", "Desserts", "Video games", "Things that are cold", "Things with wheels", "Ocean animals", "Things you can throw"];

const RHYMES = ["CAT", "DAY", "LIGHT", "BEE", "CAKE", "NIGHT", "FUN", "KING", "STAR", "BLUE", "PLAY", "TIME", "RAIN", "SHOW", "BED", "BALL", "HAT", "SING", "TREE", "FIGHT"];

const CHAIN_STARTS = ["APPLE", "TIGER", "PARTY", "MUSIC", "OCEAN", "GUITAR", "PIZZA", "ROBOT", "DANCE", "LEMON", "SNAKE", "HOUSE"];

const SKETCHES = ["a cat", "a house", "a rocket", "a pizza", "a dinosaur", "a robot", "a tree", "a snowman", "a guitar", "a fish", "a car", "a castle", "an alien", "a cupcake", "a superhero", "a pirate ship", "a dragon", "a bicycle", "a sun wearing sunglasses", "your opponent"];

const TWISTERS = ["Red lorry, yellow lorry", "She sells seashells by the seashore", "Peter Piper picked a peck of pickled peppers", "Unique New York", "Toy boat", "Irish wristwatch", "Fresh fried fish", "Six slippery snails slid slowly seaward", "Black back bat", "Truly rural", "Big black bug bleeds blue black blood", "Which witch is which?", "Rubber baby buggy bumpers", "Eleven benevolent elephants", "Pad kid poured curd pulled cod", "Freshly fried flying fish"];

const IMPRESSIONS = ["a pirate", "a robot", "a news anchor", "a cat that wants food", "a toddler who missed a nap", "a cowboy", "a movie trailer voice", "a sports commentator", "a villain explaining their plan", "a chicken", "a GPS giving directions", "a cooking show host", "a superhero landing", "a nature documentary narrator", "a flight attendant", "a fancy waiter", "a game show host", "a zombie"];

const TOPICS = ["Why pineapple belongs on pizza", "The best invention ever", "In defense of socks with sandals", "Your dream vacation", "Why cats are secretly in charge", "How to make perfect toast", "Naps at work should be the law", "Aliens are real and here's why", "Why Mondays are great", "The perfect sandwich", "The greatest movie ever made", "Why you should run this party", "The best pizza topping", "Why dogs are better than cats", "What I'd do with a million dollars"];

const SONGS = ["Happy Birthday", "Jingle Bells", "Twinkle Twinkle Little Star", "Row, Row, Row Your Boat", "Old MacDonald Had a Farm", "The Wheels on the Bus", "Mary Had a Little Lamb", "Baby Shark", "The Star-Spangled Banner", "Take Me Out to the Ball Game", "Here Comes the Bride", "Für Elise", "Pop Goes the Weasel", "If You're Happy and You Know It", "London Bridge Is Falling Down", "Ode to Joy", "The Pink Panther theme", "The Jaws theme", "Mission: Impossible theme", "Super Mario Bros. theme", "The Imperial March", "Jeopardy! think music", "We Wish You a Merry Christmas", "Itsy Bitsy Spider", "Rudolph the Red-Nosed Reindeer"];
