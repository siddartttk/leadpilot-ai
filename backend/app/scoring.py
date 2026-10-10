import re

SERVICES = ['Website development','E-commerce solutions','AI automation','Business analytics','Customer support chatbots','Custom software development']
STAGES = ['New','Contacted','Qualified','Proposal Sent','Negotiation','Won','Lost']
SOURCES = ['Website','Referral','Email','Social','Other']

def qualify(lead, threshold=75):
    text = lead.message.lower()
    budget = lead.budget
    timeline = bool(re.search(r'\b(weeks?|months?|days?|asap|urgent|quarter)\b',text))
    intent = bool(re.search(r'\b(proposal|quote|hire|ready|looking for|need|build|launch)\b',text))
    factors = [
        {'name':'Budget fit','points':25 if budget is not None and budget>=100000 else 15 if budget is not None and budget>=50000 else 5 if budget is not None and budget>0 else 0,'max':25,'reason':'Based only on the recorded budget; agency reference band starts at ₹50,000.'},
        {'name':'Service fit','points':25 if lead.service in SERVICES else 0,'max':25,'reason':'Requested service is in the agency service catalog.'},
        {'name':'Project timeline','points':15 if timeline else 0,'max':15,'reason':'Timeline language is present; confirm the actual date.' if timeline else 'No explicit timeline language found.'},
        {'name':'Inquiry completeness','points':sum([5 if lead.company else 0,5 if len(lead.message)>=80 else 0,5 if lead.email else 0]),'max':15,'reason':'Company, inquiry of at least 80 characters, and email contribute 5 points each.'},
        {'name':'Purchase intent','points':20 if intent else 0,'max':20,'reason':'Explicit project or buying language detected.' if intent else 'Confirm whether there is an active project.'}
    ]
    missing = ([] if budget is not None else ['Budget']) + ([] if timeline else ['Timeline']) + ([] if lead.company else ['Company'])
    score = sum(f['points'] for f in factors)
    category = 'Needs more information' if len(missing)>=2 else 'High priority' if score>=threshold else 'Medium priority' if score>=45 else 'Low priority'
    return {'score':score,'factors':factors,'missing':missing,'category':category,'next_action':'Confirm '+', '.join(missing).lower()+'.' if missing else 'Review the scope and propose a discovery conversation.','mode':'Rules-based','disclaimer':'A business qualification score, not a conversion probability.'}
