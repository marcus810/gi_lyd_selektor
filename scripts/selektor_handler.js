
// Create an array of child Text components
const children = [];
for (let i = 1; i <= childCount; i++) {
  children.push(<Text key={i} style={styles.childText}>Child {i}</Text>);
}

export function createOutputButton(OutputAmount) {
  const children = [];
  for (let i = 1; i <= OutputAmount; i++) {
    children.push(<View></View>)
  }
}