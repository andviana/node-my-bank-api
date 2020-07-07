function toMoney(value) {
    if (!value) return value;
    const formatter = new Intl.NumberFormat([], {
        style: 'currency',
        currency: 'BRL',
    });
    return formatter.format(value);
}

export {toMoney};
