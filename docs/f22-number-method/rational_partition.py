# Independent numerical analysis. Does not import or run production JS or schedule timers.
import struct,json,hashlib
from fractions import Fraction as F

def bits(x):return struct.pack('>d',x).hex()
def round64(x):return F.from_float(float(x))
c7=F.from_float(0.7);c2=F.from_float(0.02)
rows=[]
for level in range(1,25):
 n=F(level-1)
 product=round64(c2*n)
 subtraction=round64(c7-product)
 seconds=max(F(1,4),subtraction)
 request=round64(seconds*1000)
 exact=max(F(1,4),F(7,10)-F(1,50)*n)*1000
 rows.append(dict(level=level,n=level-1,product=str(product),subtraction=str(subtraction),seconds=str(seconds),request=str(request),bits=bits(float(request)),exact=str(exact),error=str(request-exact),within=abs(request-exact)<=F(1,10**9)))
bound=1000*(F(1,2**54)+22*F(1,2**59)+F(1,2**55)+F(1,2**54))+F(1,2**44)
out=dict(method='exact rational operands and explicit binary64 rounding after multiply/subtract/final multiply; no production JS',constant7=str(c7),constant2=str(c2),rows=rows,analytic_bound=str(bound),maximum_selected_error=str(max(abs(F(r['error'])) for r in rows)),all_selected_within=all(r['within'] for r in rows),level24_subtraction_below_quarter=F(rows[-1]['subtraction'])<F(1,4))
print(json.dumps(out,indent=2))
