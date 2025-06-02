const { performance } = require('perf_hooks');

// Представляет один ход (из какой пробирки в какую и сколько капель переливается)
class Move {
  constructor(from, to, amount) {
    this.from = from; // откуда
    this.to = to; // куда 
    this.amount = amount; // сколько
  }

  toString() {
    return `(${this.from}, ${this.to}) — перемещено: ${this.amount}`;
  }
}

// Модель одной пробирки
class Tube {
  constructor(contents = []) {
    // Массив цветов (например: ['R', 'R', 'G']). Хранится в порядке сверху вниз: первый элемент — верхняя капля
    this.contents = contents; 
  }
  // true, если пробирка пустая
  get isEmpty() {
    return this.contents.length === 0;
  }
  // цвет верхней капли или null 
  get topColor() {
    return this.isEmpty ? null : this.contents[0];
  }
  // количество капель в пробирке
  get height() {
    return this.contents.length;
  }
  // true, если пробирка полная
  get isFull() {
    return this.height >= VOLUME;
  }

  clone() {
    return new Tube([...this.contents]);
  }
  // можно ли переливать из этой пробирки
  canPourFrom() {
    return !this.isEmpty;
  }

  pourOut(amount = 1) {
    return this.contents.splice(0, amount);
  }

  pourIn(poured) {
    this.contents = [...poured, ...this.contents];
  }
}

// Состояние всей системы в определённый момент времени
const VOLUME = 4;
const COLORS = ['R', 'G', 'B', 'Y', 'P', 'C']; 

class GameState {
  constructor(tubes) {
    this.tubes = tubes.map(t => new Tube(t));
  }
  // Создаёт новое состояние головоломки из двумерного массива.
  static fromArray(array) {
    return new GameState(array);
  }

  clone() {
    return new GameState(this.tubes.map(tube => [...tube.contents]));
  }
  // переводит всё состояние в строку "RR|GG|"
  serialize() {
    return this.tubes.map(t => t.contents.join('')).join('|');
  }
  // проверка решена ли задача
  isSorted() {
    for (const tube of this.tubes) {
      if (tube.height > 0 && new Set(tube.contents).size !== 1) return false;
    }
    return true;
  }
  // генератор всевозможных ходов из текущего состояния
  *getPossibleMoves() {
    const N = this.tubes.length;
    // from
    for (let from = 0; from < N; from++) {
      const source = this.tubes[from];
      if (!source.canPourFrom()) continue;

      const topColor = source.topColor;
      let count = 1;
      for (let i = 1; i < source.height && source.contents[i] === topColor; i++) {
        count++;
      }
      // to
      for (let to = 0; to < N; to++) {
        if (from === to) continue;

        const dest = this.tubes[to]; // пробирка, в которую хотим перелить
        if (dest.isFull) continue; // если пробирка полная, попускаем её
        if (dest.isEmpty || dest.topColor === topColor) {
          const availableSpace = VOLUME - dest.height;
          const amountToMove = Math.min(count, availableSpace); // доступное для переливания количество капель
          yield new Move(from, to, amountToMove);
        }
      }
    }
  }
  // один ход к копии текущего состояния
  applyMove(move) {
    const newState = this.clone();
    const poured = newState.tubes[move.from].pourOut(move.amount);
    newState.tubes[move.to].pourIn(poured);
    return newState;
  }
}

// Решатель задачи (поиск решения)
class Solver {
  constructor(initialState) {
    this.initialState = initialState;
    this.visited = new Set(); // список уже просмотренных состояний (чтобы не повторяться)
    this.queue = []; // очередь состояний, которые нужно обработать
  }

  solve() {
    const start = performance.now();
    this.queue.push({ state: this.initialState, moves: [] });
    this.visited.add(this.initialState.serialize());

    let steps = 0;

    while (this.queue.length > 0) {
      const current = this.queue.shift();

      if (current.state.isSorted()) {
        const end = performance.now();
        console.log(` Решение найдено за ${current.moves.length} шагов`);
        console.log(` Время выполнения: ${(end - start).toFixed(2)} мс`);
        return current.moves;
      }

      for (const move of current.state.getPossibleMoves()) {
        const next = current.state.applyMove(move);
        const key = next.serialize();
        if (!this.visited.has(key)) {
          this.visited.add(key);
          this.queue.push({ state: next, moves: [...current.moves, move] });
        }
      }

      steps++;
      if (steps % 1000 === 0) process.stdout.write('.');
    }

    console.log(" Решение не найдено");
    return null;
  }
}

// Исходное состояние
const INITIAL_TUBES = [
  ['C', 'P', 'Y', 'B'],
  ['B', 'Y', 'P', 'C'],
  ['P', 'B', 'Y', 'G'],
  ['G', 'R', 'G', 'R'],
  ['R', 'G', 'R', 'B'],
  [], 
  []  
];

// Запуск 
function main() {
  const initial = GameState.fromArray(INITIAL_TUBES);

  console.log(" Исходное состояние:");
  initial.tubes.forEach((t, i) => {
    console.log(`${i}:`, t.contents.join(','));
  });

  console.log("\n Поиск решения...");

  const solver = new Solver(initial);
  const solution = solver.solve();

  if (solution) {
    console.log("\n\n Последовательность ходов:");
    solution.forEach((move, index) => {
      console.log(`${index + 1}. ${move.toString()}`);
    });
  }
}

main();