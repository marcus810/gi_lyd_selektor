
export const getComponentWidth = (ref: any) => {
    ref.measure((_: number, __: number, width: number) => {
        return width
      });
}