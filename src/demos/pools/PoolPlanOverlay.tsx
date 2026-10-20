import './pool-plan.css'

// Traced in the source photograph's coordinate system. Keeping the drawing in
// the same cover-sized scene as the photographs preserves the camera match.
const rim = [
  'M607 438H1033L1490 862H214Z',
  'M613 447H1030L1468 853H236Z',
  'M605 435H1037L1504 868H201Z',
  'M214 862V876H1490V862',
  'M607 438V449M1033 438V449M236 853V865M1468 853V865',
]

const structure = [
  'M613 447L648 535H1040L1030 447',
  'M236 853L369 920H1332L1468 853',
  'M648 535L369 920M1040 535L1332 920',
  'M648 535H1040',
  'M610 454H675L732 449',
  'M601 467H679L743 459V466',
  'M589 480H688L754 470V479',
  'M576 495H696L767 484V494',
  'M565 510H705L779 498V510',
  'M552 527H715L791 514V527',
  'M610 454V461M601 467V475M589 480V489M576 495V505M565 510V522',
  'M732 449L791 514M675 454L715 527',
]

const spa = [
  'M1051 433H1259L1427 486H1103Z',
  'M1071 443H1247L1368 475H1121Z',
  'M1085 452H1241L1321 474H1136Z',
  'M1051 433V490L1103 526H1427V486',
  'M1103 486V526M1259 433V443',
  'M1071 443V466L1121 501H1389V487',
  'M1121 475V501M1247 443V463',
  'M1057 451L1073 456V478L1057 471Z',
  'M1073 456L1087 459V488L1073 478',
]

const deck = [
  'M463 422H1276L1672 642V941H0V737Z',
  'M447 432H591M1043 424H1281',
  'M607 438L621 423M1033 438L1024 423',
  'M409 464H583M351 509H542M281 562H493M192 631H427M91 710H352M0 801H269',
  'M491 438L0 887M538 439L76 941',
  'M1298 441L1333 441M1385 490L1436 490M1477 544L1536 544M1281 609H1656M1359 685H1672M1439 761H1672M1516 837H1672',
  'M1412 528L1672 758M1299 531L1672 916',
  'M186 894H1524M124 931H1565',
  'M474 868L440 941M841 868V941M1210 868L1245 941',
]

const furniture = [
  // The two loungers follow the finished image, including the raised backs.
  'M1357 576L1514 550L1587 580L1404 613Z',
  'M1514 550L1569 505L1644 528L1587 580Z',
  'M1357 576V591L1404 629L1587 600V580',
  'M1404 613V629M1514 550V561M1644 528V540L1587 600',
  'M1357 591V623L1367 625V599M1404 629V652L1415 650V627',
  'M1577 603V622L1587 620V600',
  'M1369 576L1411 603L1578 574M1521 548L1572 514L1632 531',
  'M1467 637L1591 612L1672 638V684L1518 699L1467 670Z',
  'M1467 637V652L1518 684L1672 670M1518 684V699',
  'M1467 670V698L1478 700V678M1518 699V735L1530 733V698',
  'M1481 637L1525 675L1672 661',
  // A small side table between the loungers.
  'M1594 604C1591 593 1645 586 1659 599C1673 612 1608 619 1594 604Z',
  'M1594 604L1597 628C1611 638 1647 635 1657 624L1659 599',
]

function Lines({ paths, className }: { paths: string[]; className?: string }) {
  return <g className={className}>{paths.map((d, index) => <path key={index} d={d} pathLength="1" vectorEffect="non-scaling-stroke" />)}</g>
}

export default function PoolPlanOverlay() {
  return <div className="sw-pool-plan" aria-hidden="true">
    <svg viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" fill="none" focusable="false">
      <g className="sw-pool-plan-surfaces" stroke="none">
        <path d="M607 438H1033L1490 862H214Z" pathLength="1" />
        <path d="M1051 433H1259L1427 486H1103Z" pathLength="1" />
      </g>
      <Lines paths={deck} className="sw-pool-plan-deck" />
      <Lines paths={structure} className="sw-pool-plan-structure" />
      <Lines paths={rim} className="sw-pool-plan-rim" />
      <Lines paths={spa} className="sw-pool-plan-spa" />
      <Lines paths={furniture} className="sw-pool-plan-furniture" />
    </svg>
  </div>
}
