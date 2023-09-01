
function InHgtoHpa(pressure: number): number {
    return round(pressure * 33.863886666667,2)
}

function HpatoIn(pressure: number): number {
    return round(pressure / 33.863886666667,2);
}

function FtoC(tempF: number): number {
    tempF -= 32
    return round(tempF / 1.8,2)
}

function CtoF(temp: number): number {
    temp *= (9/5);
    return round(temp+32,2);
}

function MphtoKmh(speed: number): number {
    return round(speed * 1.60934,2)
}

function KmhtoMph(speed: number): number {
    return round(speed*0.621371,2);
}

function Kmhtoms(speed: number): number {
    return round(speed/3.6,2)
}

function Cltomm(clicks: number): number {
    return round(clicks * 0.2,2)
}

function MmtoInch(rain: number): number{
    return round(rain/25.4,2);
}

function round(x: number, n: number): number {
    const a = Math.pow(10, n)
    return (Math.round(x * a) / a)
}

export { InHgtoHpa, HpatoIn, FtoC, CtoF, MphtoKmh, KmhtoMph, Kmhtoms, Cltomm, MmtoInch, round }